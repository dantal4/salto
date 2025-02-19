/*
 * Copyright 2025 Salto Labs Ltd.
 * Licensed under the Salto Terms of Use (the "License");
 * You may not use this file except in compliance with the License.  You may obtain a copy of the License at https://www.salto.io/terms-of-use
 *
 * CERTAIN THIRD PARTY SOFTWARE MAY BE CONTAINED IN PORTIONS OF THE SOFTWARE. See NOTICE FILE AT https://github.com/salto-io/salto/blob/main/NOTICES
 */
import { ObjectType, ElemID, InstanceElement } from '@salto-io/adapter-api'
import { elements as elementUtils } from '@salto-io/adapter-components'
import { ZUORA_BILLING } from '../../src/constants'
import { getStandardObjectElements } from '../../src/transformers/standard_objects'
import { DEFAULT_API_DEFINITIONS } from '../../src/config'

jest.mock('@salto-io/adapter-components', () => {
  const actual = jest.requireActual('@salto-io/adapter-components')
  const getMockInstances: typeof elementUtils.swagger.getAllInstances = async () => ({
    elements: [
      new InstanceElement('a', new ObjectType({ elemID: new ElemID(ZUORA_BILLING, 'CustomObjectDefinition') })),
    ],
  })
  return {
    ...actual,
    elements: {
      ...actual.elements,
      swagger: {
        ...actual.elements.swagger,
        getAllInstances: jest.fn().mockImplementation(getMockInstances),
      },
    },
  }
})
describe('standard_objects transformer', () => {
  describe('getStandardObjectElements', () => {
    it('should clone a new StandardObjectDef type and use it for the fetched instances', async () => {
      const [type, ...instances] = await getStandardObjectElements({
        standardObjectWrapperType: new ObjectType({ elemID: new ElemID(ZUORA_BILLING, 'StandardObject') }),
        customObjectDefType: new ObjectType({
          elemID: new ElemID(ZUORA_BILLING, 'CustomObjectDefinition'),
          path: [ZUORA_BILLING, 'Types', 'CustomObjectDefinition'],
        }),
        paginator: jest.fn(),
        apiConfig: DEFAULT_API_DEFINITIONS,
      })
      expect(type).toBeInstanceOf(ObjectType)
      expect(type.elemID.name).toEqual('StandardObjectDefinition')
      expect(instances).toHaveLength(1)
      expect(instances[0]).toBeInstanceOf(InstanceElement)
      expect(await (instances[0] as InstanceElement).getType()).toEqual(type)
    })
  })
})
