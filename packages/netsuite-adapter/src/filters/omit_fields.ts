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
import { isInstanceElement, isObjectType } from '@salto-io/adapter-api'
import { transformValues } from '@salto-io/adapter-utils'
import { collections, regex } from '@salto-io/lowerdash'
import { FilterCreator, FilterWith } from '../filter'
import { FieldToOmitParams } from '../query'

const { awu } = collections.asynciterable
const { isFullRegexMatch } = regex

const FIELDS_TO_OMIT: FieldToOmitParams[] = []

const filterCreator: FilterCreator = ({ config }): FilterWith<'onFetch'> => ({
  onFetch: async elements => {
    const allFieldsToOmit = FIELDS_TO_OMIT.concat(config.fetch?.fieldsToOmit ?? [])

    if (allFieldsToOmit.length === 0) {
      return
    }

    const getFieldsToOmit = (typeName: string): string[] =>
      allFieldsToOmit
        .filter(params => isFullRegexMatch(typeName, params.type))
        .flatMap(params => params.fields)

    const omitByRegex = (fields: string[]) => (_val: unknown, key: string) =>
      fields.some(fieldToOmit => isFullRegexMatch(key, fieldToOmit))

    await awu(elements)
      .filter(isInstanceElement)
      .forEach(async instance => {
        const fieldsToOmit = getFieldsToOmit(instance.elemID.typeName)
        const updatedValues = fieldsToOmit.length > 0
          ? _.omitBy(instance.value, omitByRegex(fieldsToOmit))
          : instance.value
        instance.value = await transformValues({
          values: updatedValues,
          type: await instance.getType(),
          transformFunc: async ({ value, field }) => {
            if (!_.isPlainObject(value)) {
              return value
            }
            const fieldType = await field?.getType()
            if (!isObjectType(fieldType)) {
              return value
            }
            const innerFieldsToOmit = getFieldsToOmit(fieldType.elemID.name)
            return innerFieldsToOmit.length > 0
              ? _.omitBy(value, omitByRegex(innerFieldsToOmit))
              : value
          },
          strict: false,
        }) ?? {}
      })
  },
})

export default filterCreator
