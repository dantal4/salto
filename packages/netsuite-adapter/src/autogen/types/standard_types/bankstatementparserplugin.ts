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

export const bankstatementparserpluginType = (): TypeAndInnerTypes => {
  const innerTypes: Record<string, ObjectType> = {}

  const bankstatementparserpluginElemID = new ElemID(constants.NETSUITE, 'bankstatementparserplugin')

  const bankstatementparserplugin = new ObjectType({
    elemID: bankstatementparserpluginElemID,
    annotations: {},
    fields: {
      scriptid: {
        refType: createRefToElmWithValue(BuiltinTypes.SERVICE_ID),
        annotations: {
          [CORE_ANNOTATIONS.REQUIRED]: true,
          [constants.IS_ATTRIBUTE]: true,
          [CORE_ANNOTATIONS.RESTRICTION]: createRestriction({ regex: '^customscript[0-9a-z_]+' }),
        },
      } /* Original description: This attribute value can be up to 40 characters long.   The default value is ‘customscript’. */,
      name: {
        refType: createRefToElmWithValue(BuiltinTypes.STRING /* Original type was single-select list */),
        annotations: {
          [CORE_ANNOTATIONS.REQUIRED]: true,
          // [CORE_ANNOTATIONS.RESTRICTION]: createRestriction({ max_length: 40 }),
        },
      } /* Original description: This field value can be up to 40 characters long.   This field accepts references to the string custom type. */,
      scriptfile: {
        refType: createRefToElmWithValue(BuiltinTypes.STRING /* Original type was filereference */),
        annotations: {
          [CORE_ANNOTATIONS.REQUIRED]: true,
        },
      } /* Original description: This field must reference a .js file. */,
      description: {
        refType: createRefToElmWithValue(BuiltinTypes.STRING /* Original type was single-select list */),
        annotations: {
          // [CORE_ANNOTATIONS.RESTRICTION]: createRestriction({ max_length: 999 }),
        },
      } /* Original description: This field value can be up to 999 characters long.   This field accepts references to the string custom type. */,
      isinactive: {
        refType: createRefToElmWithValue(BuiltinTypes.BOOLEAN),
        annotations: {},
      } /* Original description: The default value is F. */,
      notifyadmins: {
        refType: createRefToElmWithValue(BuiltinTypes.BOOLEAN),
        annotations: {},
      } /* Original description: The default value is F. */,
      notifyemails: {
        refType: createRefToElmWithValue(BuiltinTypes.STRING),
        annotations: {
          // [CORE_ANNOTATIONS.RESTRICTION]: createRestriction({ max_length: 999 }),
        },
      } /* Original description: This field value can be up to 999 characters long. */,
      notifygroup: {
        refType: createRefToElmWithValue(BuiltinTypes.STRING),
        annotations: {},
      } /* Original description: Note Account-specific values are not supported by SDF. */,
      notifyowner: {
        refType: createRefToElmWithValue(BuiltinTypes.BOOLEAN),
        annotations: {},
      } /* Original description: The default value is T. */,
      notifyuser: {
        refType: createRefToElmWithValue(BuiltinTypes.BOOLEAN),
        annotations: {},
      } /* Original description: The default value is F. */,
      loglevel: {
        refType: createRefToElmWithValue(enums.script_loglevel),
        annotations: {},
      } /* Original description: For information about possible values, see script_loglevel.   The default value is 'DEBUG'. */,
      runasrole: {
        refType: createRefToElmWithValue(BuiltinTypes.STRING /* Original type was single-select list */),
        annotations: {},
      } /* Original description: This field accepts references to the role custom type.   For information about other possible values, see generic_role. */,
      status: {
        refType: createRefToElmWithValue(enums.script_status),
        annotations: {},
      } /* Original description: For information about possible values, see script_status.   The default value is 'TESTING'. */,
    },
    path: [constants.NETSUITE, constants.TYPES_PATH, bankstatementparserpluginElemID.name],
  })

  return { type: bankstatementparserplugin, innerTypes }
}
