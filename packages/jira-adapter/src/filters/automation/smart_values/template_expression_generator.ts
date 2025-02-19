/*
 * Copyright 2025 Salto Labs Ltd.
 * Licensed under the Salto Terms of Use (the "License");
 * You may not use this file except in compliance with the License.  You may obtain a copy of the License at https://www.salto.io/terms-of-use
 *
 * CERTAIN THIRD PARTY SOFTWARE MAY BE CONTAINED IN PORTIONS OF THE SOFTWARE. See NOTICE FILE AT https://github.com/salto-io/salto/blob/main/NOTICES
 */
import { InstanceElement, ReferenceExpression, TemplateExpression, TemplatePart } from '@salto-io/adapter-api'
import { extractTemplate } from '@salto-io/adapter-utils'

const REFERENCE_MARKER_REGEX = /(\{\{.+?\}\})/

// E.g abcd - true, a.b.c.d - false
const FIELD_REGEX = /^([a-zA-Z0-9_ ]+)(?: |$|\.)/

const POSSIBLE_PREFIXES = [
  'issue.fields.',
  'destinationIssue.fields.',
  'triggerIssue.fields.',
  'issue.',
  'destinationIssue.',
  'triggerIssue.',
  'fields.',
]

const SMART_VALUE_PREFIX = '{{'
const SMART_VALUE_SUFFIX = '}}'

type GenerateTemplateParams = {
  referenceStr: string
  fieldInstancesByName: Record<string, InstanceElement[]>
  fieldInstancesById: Record<string, InstanceElement>
}

const handleJiraReference = ({
  referenceStr,
  fieldInstancesByName,
  fieldInstancesById,
}: GenerateTemplateParams): {
  templatePart: TemplatePart
  error?: 'ambiguous'
} => {
  if (Object.prototype.hasOwnProperty.call(fieldInstancesById, referenceStr)) {
    const instance = fieldInstancesById[referenceStr]
    return { templatePart: new ReferenceExpression(instance.elemID, instance) }
  }

  if (Object.prototype.hasOwnProperty.call(fieldInstancesByName, referenceStr)) {
    const instances = fieldInstancesByName[referenceStr]

    if (instances.length > 1) {
      return {
        templatePart: referenceStr,
        error: 'ambiguous',
      }
    }

    return {
      templatePart: new ReferenceExpression(instances[0].elemID.createNestedID('name'), instances[0].value.name),
    }
  }
  return { templatePart: referenceStr }
}

/**
 * This function receives a string that contains issue references and replaces
 * it with salto style templates.
 */
export const stringToTemplate = ({
  referenceStr,
  fieldInstancesByName,
  fieldInstancesById,
}: GenerateTemplateParams): {
  template: TemplateExpression | string
  ambiguousTokens: Set<string>
} => {
  const ambiguousTokens = new Set<string>()

  const template = extractTemplate(referenceStr, [REFERENCE_MARKER_REGEX], expression => {
    if (!expression.startsWith(SMART_VALUE_PREFIX) || !expression.endsWith(SMART_VALUE_SUFFIX)) {
      return expression
    }

    const smartValue = expression.slice(SMART_VALUE_PREFIX.length, -SMART_VALUE_SUFFIX.length)

    const prefix = POSSIBLE_PREFIXES.find(pref => smartValue.startsWith(pref)) ?? ''

    const jiraReference = smartValue.slice(prefix.length).match(FIELD_REGEX)
    if (jiraReference) {
      const innerRef = jiraReference[1]

      const { templatePart, error } = handleJiraReference({
        referenceStr: innerRef,
        fieldInstancesByName,
        fieldInstancesById,
      })

      if (error === 'ambiguous') {
        ambiguousTokens.add(innerRef)
      }

      return [
        `${SMART_VALUE_PREFIX}${prefix}`,
        templatePart,
        `${smartValue.substring(prefix.length + innerRef.length)}${SMART_VALUE_SUFFIX}`,
      ]
    }
    return expression
  })

  return { template, ambiguousTokens }
}
