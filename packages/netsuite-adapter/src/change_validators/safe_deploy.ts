/*
*                      Copyright 2022 Salto Labs Ltd.
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
import _ from 'lodash'
import { isInstanceChange, InstanceElement, Element,
  ProgressReporter, ChangeError, Change, isInstanceElement, isEqualElements,
  getChangeData, ModificationChange,
  isRemovalChange, isModificationChange, isAdditionChange, AdditionChange, RemovalChange } from '@salto-io/adapter-api'
import { collections, values } from '@salto-io/lowerdash'
import { buildNetsuiteQuery, convertToQueryParams, NetsuiteQuery, NetsuiteQueryParameters } from '../query'
import { isCustomType, isFileCabinetInstance } from '../types'
import { PATH, SCRIPT_ID } from '../constants'
import { getTypeIdentifier } from '../data_elements/types'
import { FailedFiles, FailedTypes } from '../client/types'
import { getAllReferencedInstances, getRequiredReferencedInstances } from '../reference_dependencies'

export type FetchByQueryReturnType = {
  failedToFetchAllAtOnce: boolean
  failedFilePaths: FailedFiles
  failedTypes: FailedTypes
  elements: Element[]
}

export type FetchByQueryFunc = (
  fetchQuery: NetsuiteQuery,
  progressReporter: ProgressReporter,
  useChangesDetection: boolean
) => Promise<FetchByQueryReturnType>

export type QueryChangeValidator = (
  changes: ReadonlyArray<Change>,
  fetchByQuery: FetchByQueryFunc,
  deployAllReferencedElements?: boolean
) => Promise<ReadonlyArray<ChangeError>>

type DependencyType = 'referenced' | 'required'
type AdditionalInstance = {
  instance: InstanceElement
  referer: InstanceElement
  dependency: DependencyType
}

const { awu } = collections.asynciterable
const { isDefined } = values

const getIdentifyingValue = async (instance: InstanceElement): Promise<string> => (
  instance.value[SCRIPT_ID] ?? instance.value[getTypeIdentifier(await instance.getType())]
)
const getIdentifingValuesByType = async (
  instancesByType: Record<string, InstanceElement[]>
): Promise<Record<string, string[]>> => (
  Object.fromEntries(await awu(Object.entries(instancesByType))
    .map(async ([type, instances]) => [
      type,
      await awu(instances).map(inst => getIdentifyingValue(inst)).toArray(),
    ])
    .toArray())
)

const getMatchingServiceInstances = async (
  baseInstances: InstanceElement[],
  fetchByQuery: FetchByQueryFunc
): Promise<Record<string, InstanceElement>> => {
  const filePaths = baseInstances
    .filter(isFileCabinetInstance)
    .filter(inst => inst.value[PATH] !== undefined)
    .map(inst => inst.value[PATH])

  const nonFileCabinetInstances = baseInstances.filter(inst => !isFileCabinetInstance(inst))
  const instancesByType = _.groupBy(nonFileCabinetInstances, instance => instance.elemID.typeName)
  const fetchTarget: NetsuiteQueryParameters = {
    types: await getIdentifingValuesByType(instancesByType),
    filePaths,
  }

  const fetchQuery = buildNetsuiteQuery(convertToQueryParams(fetchTarget))
  const { elements } = await fetchByQuery(fetchQuery, { reportProgress: () => null }, false)
  return _.keyBy(elements.filter(isInstanceElement), element => element.elemID.getFullName())
}

const getReferencedInstances = async (
  instance: InstanceElement,
  deployAllReferencedElements: boolean
): Promise<ReadonlyArray<InstanceElement>> => (
  deployAllReferencedElements
    ? getAllReferencedInstances([instance])
    : getRequiredReferencedInstances([instance])
)

const getAdditionalInstances = async (
  instances: InstanceElement[],
  deployAllReferencedElements: boolean
): Promise<AdditionalInstance[]> => {
  const dependency: DependencyType = deployAllReferencedElements ? 'referenced' : 'required'
  const instancesElemIdSet = new Set(instances.map(instance => instance.elemID.getFullName()))
  return awu(instances)
    .flatMap(async referer => {
      const additionalInstances = await getReferencedInstances(referer, deployAllReferencedElements)
      return additionalInstances.map(instance => {
        if (instancesElemIdSet.has(instance.elemID.getFullName())) {
          return undefined
        }
        instancesElemIdSet.add(instance.elemID.getFullName())
        return { instance, referer, dependency }
      })
    })
    .filter(isDefined)
    .toArray()
}

const toChangeWarning = (change: Change<InstanceElement>): ChangeError => (
  {
    elemID: getChangeData(change).elemID,
    severity: 'Warning',
    message: 'Continuing the deploy proccess will override changes made in the service to this element.',
    detailedMessage: `The element ${getChangeData(change).elemID.name}, which you are attempting to ${change.action}, has recently changed in the service.`,
  }
)

const toAdditionalInstanceWarning = (
  { instance, referer, dependency }: AdditionalInstance
): ChangeError => ({
  elemID: referer.elemID,
  severity: 'Warning',
  message: 'Continuing the deploy proccess will override changes made in the service to a referenced element.',
  detailedMessage: `The element ${instance.elemID.getFullName()}, which is ${dependency} in ${referer.elemID.name} and going to be deployed with it, has recently changed in the service.`,
})

const hasChangedInService = (
  change: RemovalChange<InstanceElement> | ModificationChange<InstanceElement>,
  serviceInstance: InstanceElement
): boolean => (
  !isEqualElements(change.data.before, serviceInstance)
)

const isChangeTheSameInService = (
  change: ModificationChange<InstanceElement> | AdditionChange<InstanceElement>,
  serviceInstance: InstanceElement
): boolean => (
  isEqualElements(change.data.after, serviceInstance)
)

const isModificationOverridingChange = (
  change: Change<InstanceElement>,
  matchingServiceInstance: InstanceElement,
): boolean => (
  isModificationChange(change)
  && hasChangedInService(change, matchingServiceInstance)
  && !isChangeTheSameInService(change, matchingServiceInstance)
)

const isRemovalOverridingChange = (
  change: Change<InstanceElement>,
  matchingServiceInstance: InstanceElement,
): boolean => (
  isRemovalChange(change)
  && hasChangedInService(change, matchingServiceInstance)
)

const isAdditionOverridingChange = (
  change: Change<InstanceElement>,
  matchingServiceInstance: InstanceElement,
): boolean => (
  isAdditionChange(change)
  && matchingServiceInstance !== undefined
  && !isChangeTheSameInService(change, matchingServiceInstance)
)


const changeValidator: QueryChangeValidator = async (
  changes: ReadonlyArray<Change>,
  fetchByQuery: FetchByQueryFunc,
  deployAllReferencedElements = false
) => {
  const instanceChanges = changes.filter(isInstanceChange)

  const [customTypes, dataTypes] = _.partition(
    instanceChanges.map(getChangeData),
    instance => isCustomType(instance.refType)
  )

  const referencedCustomTypes = await getAllReferencedInstances(customTypes)

  const serviceInstances = await getMatchingServiceInstances(
    [...referencedCustomTypes, ...dataTypes],
    fetchByQuery
  )

  const isOverridingChange = (
    change: Change<InstanceElement>
  ): boolean => {
    const matchingServiceInstance = serviceInstances[getChangeData(change).elemID.getFullName()]
    return (isModificationOverridingChange(change, matchingServiceInstance)
    || isRemovalOverridingChange(change, matchingServiceInstance)
    || isAdditionOverridingChange(change, matchingServiceInstance)
    )
  }

  const isOverridingAdditionalInstance = ({ instance }: AdditionalInstance): boolean =>
    !isEqualElements(instance, serviceInstances[instance.elemID.getFullName()])

  const changesWarnings = instanceChanges
    .filter(isOverridingChange)
    .map(toChangeWarning)

  const additionalInstances = await getAdditionalInstances(
    customTypes, deployAllReferencedElements
  )

  const additionalInstancesWarnings = additionalInstances
    .filter(isOverridingAdditionalInstance)
    .map(toAdditionalInstanceWarning)

  return [...changesWarnings, ...additionalInstancesWarnings]
}

export default changeValidator
