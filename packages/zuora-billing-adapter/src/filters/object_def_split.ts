/*
 * Copyright 2025 Salto Labs Ltd.
 * Licensed under the Salto Terms of Use (the "License");
 * You may not use this file except in compliance with the License.  You may obtain a copy of the License at https://www.salto.io/terms-of-use
 *
 * CERTAIN THIRD PARTY SOFTWARE MAY BE CONTAINED IN PORTIONS OF THE SOFTWARE. See NOTICE FILE AT https://github.com/salto-io/salto/blob/main/NOTICES
 */
import _ from 'lodash'
import { Element, ObjectType, Field } from '@salto-io/adapter-api'
import { pathNaclCase } from '@salto-io/adapter-utils'
import { promises } from '@salto-io/lowerdash'
import { isObjectDef, isCustomField } from '../element_utils'
import { FilterCreator } from '../filter'
import { ZUORA_BILLING, OBJECTS_PATH } from '../constants'

export const annotationsFileName = (objectName: string): string => `${pathNaclCase(objectName)}Annotations`
export const standardFieldsFileName = (objectName: string): string => `${pathNaclCase(objectName)}StandardFields`
export const customFieldsFileName = (objectName: string): string => `${pathNaclCase(objectName)}CustomFields`

const { removeAsync } = promises.array
const getObjectDirectoryPath = (obj: ObjectType): string[] => [
  ZUORA_BILLING,
  OBJECTS_PATH,
  pathNaclCase(obj.elemID.name),
]

const objectDefToSplitElements = (customObject: ObjectType): ObjectType[] => {
  const annotationsObject = new ObjectType({
    elemID: customObject.elemID,
    annotationRefsOrTypes: customObject.annotationRefTypes,
    annotations: customObject.annotations,
    path: [...getObjectDirectoryPath(customObject), annotationsFileName(customObject.elemID.name)],
  })
  const standardFieldsObject = new ObjectType({
    elemID: customObject.elemID,
    fields: _.pickBy(customObject.fields, (f: Field) => !isCustomField(f)),
    path: [...getObjectDirectoryPath(customObject), standardFieldsFileName(customObject.elemID.name)],
  })
  const customFieldsObject = new ObjectType({
    elemID: customObject.elemID,
    fields: _.pickBy(customObject.fields, (f: Field) => isCustomField(f)),
    path: [...getObjectDirectoryPath(customObject), customFieldsFileName(customObject.elemID.name)],
  })
  return [annotationsObject, standardFieldsObject, customFieldsObject]
}

const filterCreator: FilterCreator = () => ({
  name: 'objectDefinitionSplitFilter',
  onFetch: async (elements: Element[]) => {
    const objectDefs = (await removeAsync(elements, isObjectDef)) as ObjectType[]
    const newSplitObjectDefs = objectDefs.flatMap(objectDefToSplitElements)
    elements.push(...newSplitObjectDefs)
  },
})

export default filterCreator
