/*
 * Copyright 2025 Salto Labs Ltd.
 * Licensed under the Salto Terms of Use (the "License");
 * You may not use this file except in compliance with the License.  You may obtain a copy of the License at https://www.salto.io/terms-of-use
 *
 * CERTAIN THIRD PARTY SOFTWARE MAY BE CONTAINED IN PORTIONS OF THE SOFTWARE. See NOTICE FILE AT https://github.com/salto-io/salto/blob/main/NOTICES
 */
import { InstanceElement, ObjectType, ElemID, ListType, BuiltinTypes, isEqualElements } from '@salto-io/adapter-api'
import { SUPPORTED_TYPES } from '../../src/config'
import { ZUORA_BILLING, LIST_ALL_SETTINGS_TYPE } from '../../src/constants'
import { generateBillingSettingsTypes } from '../../src/transformers/billing_settings'

describe('billing_settings transformer', () => {
  let ListAllSettingsType: ObjectType

  beforeEach(async () => {
    ListAllSettingsType = new ObjectType({
      elemID: new ElemID(ZUORA_BILLING, LIST_ALL_SETTINGS_TYPE),
      fields: {
        settings: { refType: new ListType(BuiltinTypes.UNKNOWN) },
      },
    })
  })

  describe('generateBillingSettingsTypes', () => {
    it('should return an empty response when no setting types are listed', async () => {
      expect(
        await generateBillingSettingsTypes(
          [
            new InstanceElement('inst1', ListAllSettingsType, {
              settings: [],
            }),
          ],
          {
            swagger: { url: 'ignored' },
            types: {},
            typeDefaults: { transformation: { idFields: ['a'] } },
            supportedTypes: SUPPORTED_TYPES,
          },
        ),
      ).toEqual({ allTypes: {}, parsedConfigs: {} })
      expect(
        await generateBillingSettingsTypes([new InstanceElement('inst1', ListAllSettingsType)], {
          swagger: { url: 'ignored' },
          types: {},
          typeDefaults: { transformation: { idFields: ['a'] } },
          supportedTypes: SUPPORTED_TYPES,
        }),
      ).toEqual({ allTypes: {}, parsedConfigs: {} })
    })

    it('should generate the right object types', async () => {
      const inst = new InstanceElement('inst1', ListAllSettingsType, {
        settings: [
          {
            key: 'key1',
            description: '',
            pathPattern: '/aaa',
            httpOperations: [
              {
                method: 'GET',
                url: '/settings/aaa',
                parameters: [],
                responseType: {
                  $ref: '#/definitions/AAA',
                  definitions: {
                    AAA: {
                      additionalProperties: false,
                      type: 'object',
                      properties: {
                        a: {
                          type: 'boolean',
                        },
                        b: {
                          type: 'boolean',
                        },
                        nested: {
                          $ref: '#/definitions/ABC',
                        },
                      },
                    },
                    ABC: {
                      type: 'object',
                    },
                  },
                },
              },
              {
                method: 'PUT',
                url: '/settings/aaa',
                parameters: [],
                requestType: {
                  $ref: '#/definitions/AAA',
                  definitions: { AAA: {} },
                },
                responseType: {
                  $ref: '#/definitions/AAA',
                  definitions: { AAA: {} },
                },
              },
            ],
          },
          {
            key: 'key2',
            description: '',
            pathPattern: '/bbb',
            httpOperations: [
              {
                method: 'GET',
                url: '/settings/bbb',
                parameters: [],
                // primitive - cannot currently be fetched
                responseType: {
                  type: 'boolean',
                },
              },
            ],
          },
        ],
      })
      const { allTypes, parsedConfigs } = await generateBillingSettingsTypes([inst], {
        swagger: { url: 'ignored' },
        types: {},
        typeDefaults: { transformation: { idFields: ['a'] } },
        supportedTypes: {
          Settings_AAA: ['Settings_AAA'],
          Settings_ABC: ['Settings_ABC'],
        },
      })
      expect(parsedConfigs).toEqual({ Settings_AAA: { request: { url: '/settings/aaa' } } })
      expect(Object.keys(allTypes).sort()).toEqual(['Settings_AAA', 'Settings_ABC'])
      expect(
        isEqualElements(
          allTypes.Settings_AAA,
          new ObjectType({
            elemID: new ElemID(ZUORA_BILLING, 'Settings_AAA'),
            fields: {
              a: { refType: BuiltinTypes.BOOLEAN },
              b: { refType: BuiltinTypes.BOOLEAN },
              nested: { refType: allTypes.Settings_ABC },
            },
          }),
        ),
      ).toBeTruthy()
    })
  })
})
