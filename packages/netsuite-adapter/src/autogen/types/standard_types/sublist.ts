/*
 * Copyright 2025 Salto Labs Ltd.
 * Licensed under the Salto Terms of Use (the "License");
 * You may not use this file except in compliance with the License.  You may obtain a copy of the License at https://www.salto.io/terms-of-use
 *
 * CERTAIN THIRD PARTY SOFTWARE MAY BE CONTAINED IN PORTIONS OF THE SOFTWARE. See NOTICE FILE AT https://github.com/salto-io/salto/blob/main/NOTICES
 */
/* eslint-disable max-len */
/* eslint-disable camelcase */
import {
  BuiltinTypes,
  createRefToElmWithValue,
  CORE_ANNOTATIONS,
  ElemID,
  ObjectType,
  createRestriction,
} from '@salto-io/adapter-api'
import * as constants from '../../../constants'
import { TypeAndInnerTypes } from '../../../types/object_types'
import { enums } from '../enums'

export const sublistType = (): TypeAndInnerTypes => {
  const innerTypes: Record<string, ObjectType> = {}

  const sublistElemID = new ElemID(constants.NETSUITE, 'sublist')

  const sublist = new ObjectType({
    elemID: sublistElemID,
    annotations: {},
    fields: {
      scriptid: {
        refType: createRefToElmWithValue(BuiltinTypes.SERVICE_ID),
        annotations: {
          [CORE_ANNOTATIONS.REQUIRED]: true,
          [constants.IS_ATTRIBUTE]: true,
          [CORE_ANNOTATIONS.RESTRICTION]: createRestriction({ regex: '^custsublist[0-9a-z_]+' }),
        },
      } /* Original description: This attribute value can be up to 40 characters long.   The default value is ‘custsublist’. */,
      label: {
        refType: createRefToElmWithValue(BuiltinTypes.STRING /* Original type was single-select list */),
        annotations: {
          [CORE_ANNOTATIONS.REQUIRED]: true,
        },
      } /* Original description: This field accepts references to the string custom type. */,
      savedsearch: {
        refType: createRefToElmWithValue(BuiltinTypes.STRING /* Original type was single-select list */),
        annotations: {
          [CORE_ANNOTATIONS.REQUIRED]: true,
        },
      } /* Original description: This field accepts references to the savedsearch custom type. */,
      sublisttype: {
        refType: createRefToElmWithValue(enums.generic_tab_type),
        annotations: {
          [CORE_ANNOTATIONS.REQUIRED]: true,
        },
      } /* Original description: For information about possible values, see generic_tab_type. */,
      tab: {
        refType: createRefToElmWithValue(BuiltinTypes.STRING /* Original type was single-select list */),
        annotations: {},
      } /* Original description: This field accepts references to the subtab custom type.   For information about other possible values, see generic_tab_parent. */,
      field: {
        refType: createRefToElmWithValue(BuiltinTypes.STRING /* Original type was single-select list */),
        annotations: {},
      } /* Original description: This field accepts references to the following custom types:   transactionbodycustomfield   itemcustomfield   entitycustomfield   crmcustomfield   For information about other possible values, see sublist_standard_fields. */,
      purchase: {
        refType: createRefToElmWithValue(BuiltinTypes.BOOLEAN),
        annotations: {},
      } /* Original description: This field is available when the sublisttype value is equal to TRANSACTION.   The default value is F. */,
      sale: {
        refType: createRefToElmWithValue(BuiltinTypes.BOOLEAN),
        annotations: {},
      } /* Original description: This field is available when the sublisttype value is equal to TRANSACTION.   The default value is F. */,
      opportunity: {
        refType: createRefToElmWithValue(BuiltinTypes.BOOLEAN),
        annotations: {},
      } /* Original description: This field is available when the sublisttype value is equal to TRANSACTION.   The default value is F. */,
      journal: {
        refType: createRefToElmWithValue(BuiltinTypes.BOOLEAN),
        annotations: {},
      } /* Original description: This field is available when the sublisttype value is equal to TRANSACTION.   The default value is F. */,
      expensereport: {
        refType: createRefToElmWithValue(BuiltinTypes.BOOLEAN),
        annotations: {},
      } /* Original description: This field is available when the sublisttype value is equal to TRANSACTION.   The default value is F. */,
      inventoryadjustment: {
        refType: createRefToElmWithValue(BuiltinTypes.BOOLEAN),
        annotations: {},
      } /* Original description: This field is available when the sublisttype value is equal to TRANSACTION.   The default value is F. */,
      assemblybuild: {
        refType: createRefToElmWithValue(BuiltinTypes.BOOLEAN),
        annotations: {},
      } /* Original description: This field is available when the sublisttype value is equal to TRANSACTION.   The default value is F. */,
      fulfillmentrequest: {
        refType: createRefToElmWithValue(BuiltinTypes.BOOLEAN),
        annotations: {},
      } /* Original description: This field is available when the sublisttype value is equal to TRANSACTION.   The default value is F. */,
      storepickup: {
        refType: createRefToElmWithValue(BuiltinTypes.BOOLEAN),
        annotations: {},
      } /* Original description: This field is available when the sublisttype value is equal to TRANSACTION.   The default value is F. */,
      itemreceipt: {
        refType: createRefToElmWithValue(BuiltinTypes.BOOLEAN),
        annotations: {},
      } /* Original description: This field is available when the sublisttype value is equal to TRANSACTION.   The default value is F. */,
      itemfulfillment: {
        refType: createRefToElmWithValue(BuiltinTypes.BOOLEAN),
        annotations: {},
      } /* Original description: This field is available when the sublisttype value is equal to TRANSACTION.   The default value is F. */,
      payment: {
        refType: createRefToElmWithValue(BuiltinTypes.BOOLEAN),
        annotations: {},
      } /* Original description: This field is available when the sublisttype value is equal to TRANSACTION.   The default value is F. */,
      vendorpayment: {
        refType: createRefToElmWithValue(BuiltinTypes.BOOLEAN),
        annotations: {},
      } /* Original description: This field is available when the sublisttype value is equal to TRANSACTION.   The default value is F. */,
      deposit: {
        refType: createRefToElmWithValue(BuiltinTypes.BOOLEAN),
        annotations: {},
      } /* Original description: This field is available when the sublisttype value is equal to TRANSACTION.   The default value is F. */,
      depositapplication: {
        refType: createRefToElmWithValue(BuiltinTypes.BOOLEAN),
        annotations: {},
      } /* Original description: This field is available when the sublisttype value is equal to TRANSACTION.   The default value is F. */,
      customer: {
        refType: createRefToElmWithValue(BuiltinTypes.BOOLEAN),
        annotations: {},
      } /* Original description: This field is available when the sublisttype value is equal to ENTITY.   The default value is F. */,
      job: {
        refType: createRefToElmWithValue(BuiltinTypes.BOOLEAN),
        annotations: {},
      } /* Original description: This field is available when the sublisttype value is equal to ENTITY.   The default value is F. */,
      vendor: {
        refType: createRefToElmWithValue(BuiltinTypes.BOOLEAN),
        annotations: {},
      } /* Original description: This field is available when the sublisttype value is equal to ENTITY.   The default value is F. */,
      employee: {
        refType: createRefToElmWithValue(BuiltinTypes.BOOLEAN),
        annotations: {},
      } /* Original description: This field is available when the sublisttype value is equal to ENTITY.   The default value is F. */,
      partner: {
        refType: createRefToElmWithValue(BuiltinTypes.BOOLEAN),
        annotations: {},
      } /* Original description: This field is available when the sublisttype value is equal to ENTITY.   The default value is F. */,
      contact: {
        refType: createRefToElmWithValue(BuiltinTypes.BOOLEAN),
        annotations: {},
      } /* Original description: This field is available when the sublisttype value is equal to ENTITY.   The default value is F. */,
      inventoryitem: {
        refType: createRefToElmWithValue(BuiltinTypes.BOOLEAN),
        annotations: {},
      } /* Original description: This field is available when the sublisttype value is equal to ITEM.   The default value is F. */,
      noninventoryitem: {
        refType: createRefToElmWithValue(BuiltinTypes.BOOLEAN),
        annotations: {},
      } /* Original description: This field is available when the sublisttype value is equal to ITEM.   The default value is F. */,
      service: {
        refType: createRefToElmWithValue(BuiltinTypes.BOOLEAN),
        annotations: {},
      } /* Original description: This field is available when the sublisttype value is equal to ITEM.   The default value is F. */,
      othercharge: {
        refType: createRefToElmWithValue(BuiltinTypes.BOOLEAN),
        annotations: {},
      } /* Original description: This field is available when the sublisttype value is equal to ITEM.   The default value is F. */,
      itemgroup: {
        refType: createRefToElmWithValue(BuiltinTypes.BOOLEAN),
        annotations: {},
      } /* Original description: This field is available when the sublisttype value is equal to ITEM.   The default value is F. */,
      kit: {
        refType: createRefToElmWithValue(BuiltinTypes.BOOLEAN),
        annotations: {},
      } /* Original description: This field is available when the sublisttype value is equal to ITEM.   The default value is F. */,
      billofmaterials: {
        refType: createRefToElmWithValue(BuiltinTypes.BOOLEAN),
        annotations: {},
      } /* Original description: This field is available when the sublisttype value is equal to ITEM.   The default value is F. */,
      case: {
        refType: createRefToElmWithValue(BuiltinTypes.BOOLEAN),
        annotations: {},
      } /* Original description: This field is available when the sublisttype value is equal to CRM.   The default value is F. */,
      task: {
        refType: createRefToElmWithValue(BuiltinTypes.BOOLEAN),
        annotations: {},
      } /* Original description: This field is available when the sublisttype value is equal to CRM.   The default value is F. */,
      call: {
        refType: createRefToElmWithValue(BuiltinTypes.BOOLEAN),
        annotations: {},
      } /* Original description: This field is available when the sublisttype value is equal to CRM.   The default value is F. */,
      event: {
        refType: createRefToElmWithValue(BuiltinTypes.BOOLEAN),
        annotations: {},
      } /* Original description: This field is available when the sublisttype value is equal to CRM.   The default value is F. */,
      solution: {
        refType: createRefToElmWithValue(BuiltinTypes.BOOLEAN),
        annotations: {},
      } /* Original description: This field is available when the sublisttype value is equal to CRM.   The default value is F. */,
      campaign: {
        refType: createRefToElmWithValue(BuiltinTypes.BOOLEAN),
        annotations: {},
      } /* Original description: This field is available when the sublisttype value is equal to CRM.   The default value is F. */,
      issue: {
        refType: createRefToElmWithValue(BuiltinTypes.BOOLEAN),
        annotations: {},
      } /* Original description: This field is available when the sublisttype value is equal to CRM.   The default value is F. */,
      customtransactions: {
        refType: createRefToElmWithValue(BuiltinTypes.STRING /* Original type was multi-select list */),
        annotations: {},
      } /* Original description: This field is available when the sublisttype value is equal to TRANSACTION.   You can specify multiple values by separating each value with a pipe (|) symbol.   This field accepts references to the customtransactiontype custom type.   If this field appears in the project, you must reference the CUSTOMTRANSACTIONS feature in the manifest file to avoid project warnings. In the manifest file, you can specify whether this feature is required in your account. CUSTOMTRANSACTIONS must be enabled for this field to appear in your account. */,
    },
    path: [constants.NETSUITE, constants.TYPES_PATH, sublistElemID.name],
  })

  return { type: sublist, innerTypes }
}
