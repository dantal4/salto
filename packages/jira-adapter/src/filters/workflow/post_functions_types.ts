/*
 * Copyright 2025 Salto Labs Ltd.
 * Licensed under the Salto Terms of Use (the "License");
 * You may not use this file except in compliance with the License.  You may obtain a copy of the License at https://www.salto.io/terms-of-use
 *
 * CERTAIN THIRD PARTY SOFTWARE MAY BE CONTAINED IN PORTIONS OF THE SOFTWARE. See NOTICE FILE AT https://github.com/salto-io/salto/blob/main/NOTICES
 */
import { BuiltinTypes, CORE_ANNOTATIONS, ElemID, ListType, ObjectType } from '@salto-io/adapter-api'
import { elements } from '@salto-io/adapter-components'
import { createMatchingObjectType } from '@salto-io/adapter-utils'
import { JIRA, POST_FUNCTION_CONFIGURATION, SCRIPT_RUNNER_TYPE } from '../../constants'
import { PostFunction } from './types'

const postFunctionEventType = new ObjectType({
  elemID: new ElemID(JIRA, 'PostFunctionEvent'),
  fields: {
    id: { refType: BuiltinTypes.STRING, annotations: { [CORE_ANNOTATIONS.CREATABLE]: true } },
  },
  path: [JIRA, elements.TYPES_PATH, 'PostFunctionEvent'],
})

const projectRoleConfigType = new ObjectType({
  elemID: new ElemID(JIRA, 'ProjectRoleConfig'),
  fields: {
    id: { refType: BuiltinTypes.STRING, annotations: { [CORE_ANNOTATIONS.CREATABLE]: true } },
  },
  path: [JIRA, elements.TYPES_PATH, 'ProjectRoleConfig'],
})

const issueSecurityLevelType = new ObjectType({
  elemID: new ElemID(JIRA, 'IssueSecurityLevel'),
  fields: {
    id: { refType: BuiltinTypes.STRING, annotations: { [CORE_ANNOTATIONS.CREATABLE]: true } },
  },
  path: [JIRA, elements.TYPES_PATH, 'IssueSecurityLevel'],
})

const webhookConfigType = new ObjectType({
  elemID: new ElemID(JIRA, 'WebhookConfig'),
  fields: {
    id: { refType: BuiltinTypes.STRING, annotations: { [CORE_ANNOTATIONS.CREATABLE]: true } },
  },
  path: [JIRA, elements.TYPES_PATH, 'WebhookConfig'],
})

export const scriptRunnerObjectType = new ObjectType({
  elemID: new ElemID(JIRA, SCRIPT_RUNNER_TYPE),
  fields: {
    issueTypeId: { refType: BuiltinTypes.STRING, annotations: { [CORE_ANNOTATIONS.CREATABLE]: true } },
    projectId: { refType: BuiltinTypes.STRING, annotations: { [CORE_ANNOTATIONS.CREATABLE]: true } },
    groupName: { refType: BuiltinTypes.STRING, annotations: { [CORE_ANNOTATIONS.CREATABLE]: true } },
    roleId: { refType: BuiltinTypes.STRING, annotations: { [CORE_ANNOTATIONS.CREATABLE]: true } },
    boardId: { refType: BuiltinTypes.STRING, annotations: { [CORE_ANNOTATIONS.CREATABLE]: true } },
    linkTypeId: { refType: BuiltinTypes.STRING, annotations: { [CORE_ANNOTATIONS.CREATABLE]: true } },
    transitionId: { refType: BuiltinTypes.UNKNOWN, annotations: { [CORE_ANNOTATIONS.CREATABLE]: true } },
  },
  path: [JIRA, elements.TYPES_PATH, elements.SUBTYPES_PATH, SCRIPT_RUNNER_TYPE],
})

const postFunctionConfigurationType = new ObjectType({
  elemID: new ElemID(JIRA, POST_FUNCTION_CONFIGURATION),
  fields: {
    event: { refType: postFunctionEventType, annotations: { [CORE_ANNOTATIONS.CREATABLE]: true } },
    fieldId: { refType: BuiltinTypes.STRING, annotations: { [CORE_ANNOTATIONS.CREATABLE]: true } },
    sourceFieldId: {
      refType: BuiltinTypes.STRING,
      annotations: { [CORE_ANNOTATIONS.CREATABLE]: true },
    },
    destinationFieldId: {
      refType: BuiltinTypes.STRING,
      annotations: { [CORE_ANNOTATIONS.CREATABLE]: true },
    },
    copyType: { refType: BuiltinTypes.STRING, annotations: { [CORE_ANNOTATIONS.CREATABLE]: true } },
    projectRole: {
      refType: projectRoleConfigType,
      annotations: { [CORE_ANNOTATIONS.CREATABLE]: true },
    },
    issueSecurityLevel: {
      refType: issueSecurityLevelType,
      annotations: { [CORE_ANNOTATIONS.CREATABLE]: true },
    },
    webhook: { refType: webhookConfigType, annotations: { [CORE_ANNOTATIONS.CREATABLE]: true } },
    mode: { refType: BuiltinTypes.STRING, annotations: { [CORE_ANNOTATIONS.CREATABLE]: true } },
    fieldValue: {
      refType: BuiltinTypes.STRING,
      annotations: { [CORE_ANNOTATIONS.CREATABLE]: true },
    },
    value: { refType: BuiltinTypes.STRING, annotations: { [CORE_ANNOTATIONS.CREATABLE]: true } },
    scriptRunner: { refType: scriptRunnerObjectType, annotations: { [CORE_ANNOTATIONS.CREATABLE]: true } },
    FIELD_ROLE_ID: { refType: BuiltinTypes.STRING, annotations: { [CORE_ANNOTATIONS.CREATABLE]: true } },
    FIELD_RESOLUTION_ID: { refType: BuiltinTypes.STRING, annotations: { [CORE_ANNOTATIONS.CREATABLE]: true } },
    FIELD_EVENT_ID: { refType: BuiltinTypes.STRING, annotations: { [CORE_ANNOTATIONS.CREATABLE]: true } },
    FIELD_TARGET_ISSUE_TYPE: { refType: BuiltinTypes.STRING, annotations: { [CORE_ANNOTATIONS.CREATABLE]: true } },
    FIELD_TARGET_FIELD_ID: { refType: BuiltinTypes.STRING, annotations: { [CORE_ANNOTATIONS.CREATABLE]: true } },
    FIELD_SOURCE_FIELD_ID: { refType: BuiltinTypes.STRING, annotations: { [CORE_ANNOTATIONS.CREATABLE]: true } },
    FIELD_TARGET_PROJECT: { refType: BuiltinTypes.STRING, annotations: { [CORE_ANNOTATIONS.CREATABLE]: true } },
    FIELD_SECURITY_LEVEL_ID: { refType: BuiltinTypes.STRING, annotations: { [CORE_ANNOTATIONS.CREATABLE]: true } },
    FIELD_BOARD_ID: { refType: BuiltinTypes.STRING, annotations: { [CORE_ANNOTATIONS.CREATABLE]: true } },
    FIELD_SELECTED_FIELDS: {
      refType: new ListType(BuiltinTypes.STRING),
      annotations: { [CORE_ANNOTATIONS.CREATABLE]: true },
    },
  },
  path: [JIRA, elements.TYPES_PATH, POST_FUNCTION_CONFIGURATION],
})

export const postFunctionType = createMatchingObjectType<PostFunction>({
  elemID: new ElemID(JIRA, 'PostFunction'),
  fields: {
    type: { refType: BuiltinTypes.STRING },
    configuration: { refType: postFunctionConfigurationType },
  },
  path: [JIRA, elements.TYPES_PATH, 'PostFunction'],
})

export const types = [
  postFunctionEventType,
  projectRoleConfigType,
  issueSecurityLevelType,
  webhookConfigType,
  scriptRunnerObjectType,
  postFunctionConfigurationType,
  postFunctionType,
]
