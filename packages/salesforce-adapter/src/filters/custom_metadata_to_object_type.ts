/*
 *                      Copyright 2024 Salto Labs Ltd.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import {
  Change,
  Element,
  Field,
  getChangeData,
  InstanceElement,
  isField,
  isFieldChange,
  isInstanceElement,
  isObjectTypeChange,
  ObjectType,
} from '@salto-io/adapter-api'
import { collections, values } from '@salto-io/lowerdash'
import _ from 'lodash'
import { logger } from '@salto-io/logging'
import { FilterContext, LocalFilterCreator } from '../filter'
import { CUSTOM_METADATA, CUSTOM_METADATA_SUFFIX, CUSTOM_OBJECT } from '../constants'
import { createCustomObjectChange, createCustomTypeFromCustomObjectInstance } from './custom_objects_to_object_type'
import { apiName, isMetadataObjectType } from '../transformers/transformer'
import {
  apiNameSync,
  buildElementsSourceForFetch,
  isCustomMetadataRecordType,
  isInstanceOfTypeChangeSync,
  metadataTypeSync,
} from './utils'

const log = logger(module)

const { isDefined } = values
const { awu, groupByAsync } = collections.asynciterable

const createCustomMetadataRecordType = async (
  instance: InstanceElement,
  customMetadataType: ObjectType,
  config: FilterContext,
): Promise<ObjectType> => {
  const objectType = await createCustomTypeFromCustomObjectInstance({
    instance,
    metadataType: CUSTOM_METADATA,
    config,
  })
  objectType.fields = {
    ...objectType.fields,
    // We omit the "values" field, since it will be destructed in the instances later.
    ..._.omit(customMetadataType.fields, 'values'),
  }
  return objectType
}

const isCustomMetadataRecordTypeField = async (element: Element): Promise<boolean> =>
  isField(element) && isCustomMetadataRecordType(element.parent)

const isCustomMetadataRelatedChange = async (change: Change): Promise<boolean> => {
  const element = getChangeData(change)
  return (await isCustomMetadataRecordType(element)) || isCustomMetadataRecordTypeField(element)
}

const getApiNameOfRelatedChange = async (change: Change<ObjectType | Field>): Promise<string> => {
  const element = getChangeData(change)
  return isField(element) ? apiName(element.parent) : apiName(element)
}

const filterCreator: LocalFilterCreator = ({ config }) => {
  let groupedOriginalChangesByApiName: Record<string, Change[]>
  return {
    name: 'customMetadataToObjectTypeFilter',
    onFetch: async elements => {
      const customMetadataType = await awu(await buildElementsSourceForFetch(elements, config).getAll())
        .filter(isMetadataObjectType)
        .find(elem => metadataTypeSync(elem) === CUSTOM_METADATA)
      if (customMetadataType === undefined) {
        log.warn('Could not find CustomMetadata ObjectType. Skipping filter.')
        return
      }
      // The CustomObject instances that will be converted to ObjectTypes.
      const customMetadataInstances = elements
        .filter(isInstanceElement)
        .filter(e => e.elemID.name.endsWith(CUSTOM_METADATA_SUFFIX))

      const customMetadataRecordTypes = await awu(customMetadataInstances)
        .map(instance => createCustomMetadataRecordType(instance, customMetadataType, config))
        .toArray()
      _.pullAll(elements, customMetadataInstances)
      customMetadataRecordTypes.forEach(e => elements.push(e))
    },
    preDeploy: async changes => {
      const customMetadataRelatedChanges = (await awu(changes)
        .filter(c => isObjectTypeChange(c) || isFieldChange(c))
        .filter(isCustomMetadataRelatedChange)
        .toArray()) as Change<ObjectType | Field>[]

      groupedOriginalChangesByApiName = await groupByAsync(customMetadataRelatedChanges, getApiNameOfRelatedChange)

      const deployableChanges = await awu(Object.entries(groupedOriginalChangesByApiName))
        .map(entry => createCustomObjectChange(config.systemFields, ...entry))
        .toArray()
      _.pullAll(changes, customMetadataRelatedChanges)
      deployableChanges.forEach(c => changes.push(c))
    },
    onDeploy: async changes => {
      const relatedAppliedChangesApiNames = changes
        .filter(isInstanceOfTypeChangeSync(CUSTOM_OBJECT))
        .filter(c => getChangeData(c).elemID.name.endsWith(CUSTOM_METADATA_SUFFIX))
      const appliedChangesApiNames = relatedAppliedChangesApiNames
        .map(c => apiNameSync(getChangeData(c)))
        .filter(isDefined)

      const appliedOriginalChanges = appliedChangesApiNames.flatMap(name => groupedOriginalChangesByApiName[name] ?? [])

      _.pullAll(changes, relatedAppliedChangesApiNames)
      appliedOriginalChanges.forEach(c => changes.push(c))
    },
  }
}

export default filterCreator
