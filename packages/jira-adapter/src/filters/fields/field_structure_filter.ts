/*
 * Copyright 2025 Salto Labs Ltd.
 * Licensed under the Salto Terms of Use (the "License");
 * You may not use this file except in compliance with the License.  You may obtain a copy of the License at https://www.salto.io/terms-of-use
 *
 * CERTAIN THIRD PARTY SOFTWARE MAY BE CONTAINED IN PORTIONS OF THE SOFTWARE. See NOTICE FILE AT https://github.com/salto-io/salto/blob/main/NOTICES
 */
import {
  BuiltinTypes,
  CORE_ANNOTATIONS,
  Element,
  ElemIdGetter,
  Field,
  InstanceElement,
  isInstanceElement,
  isObjectType,
  ListType,
  MapType,
  ObjectType,
  ReferenceExpression,
  ServiceIds,
  Values,
} from '@salto-io/adapter-api'
import { naclCase, pathNaclCase } from '@salto-io/adapter-utils'
import { config as configUtils, elements as elementUtils } from '@salto-io/adapter-components'
import { logger } from '@salto-io/logging'
import _ from 'lodash'
import { values } from '@salto-io/lowerdash'
import { JIRA } from '../../constants'
import { JiraConfig } from '../../config/config'
import { FilterCreator } from '../../filter'
import {
  FIELD_CONTEXT_DEFAULT_TYPE_NAME,
  FIELD_CONTEXT_OPTION_TYPE_NAME,
  FIELD_CONTEXT_TYPE_NAME,
  FIELD_TYPE_NAME,
} from './constants'

const { generateInstanceNameFromConfig } = elementUtils

const log = logger(module)

const addTypeValue = (instance: InstanceElement): void => {
  if (instance.value.schema?.custom !== undefined) {
    instance.value.type = instance.value.schema.custom
    delete instance.value.schema
  }
}

const addDefaultValuesToContexts = (instance: InstanceElement, idToContext: Record<string, Values>): void => {
  ;(instance.value.contextDefaults ?? []).forEach((contextDefault: Values) => {
    if (idToContext[contextDefault.contextId] === undefined) {
      log.warn(
        `Context with id ${contextDefault.contextId} not found in instance ${instance.elemID.getFullName()} when assigning context defaults`,
      )
      return
    }
    idToContext[contextDefault.contextId].defaultValue = _.omit(contextDefault, 'contextId')
  })

  delete instance.value.contextDefaults
}

const addPropertyToContexts = ({
  instance,
  idToContext,
  allPropertiesFieldName,
  propertyFieldName,
  isGlobalFieldName,
  destinationFieldName,
}: {
  instance: InstanceElement
  idToContext: Record<string, Values>
  allPropertiesFieldName: string
  propertyFieldName: string
  isGlobalFieldName: string
  destinationFieldName: string
}): void => {
  ;(instance.value[allPropertiesFieldName] ?? [])
    .filter((property: Values) => !property[isGlobalFieldName])
    .forEach((property: Values) => {
      if (idToContext[property.contextId] === undefined) {
        log.warn(
          `Context with id ${property.contextId} not found in instance ${instance.elemID.getFullName()} when assigning ${destinationFieldName}`,
        )
        return
      }
      if (idToContext[property.contextId][destinationFieldName] === undefined) {
        idToContext[property.contextId][destinationFieldName] = []
      }
      idToContext[property.contextId][destinationFieldName].push(property[propertyFieldName])
    })

  delete instance.value[allPropertiesFieldName]
}

const addIssueTypesToContexts = (instance: InstanceElement, idToContext: Record<string, Values>): void =>
  addPropertyToContexts({
    instance,
    idToContext,
    allPropertiesFieldName: 'contextIssueTypes',
    propertyFieldName: 'issueTypeId',
    isGlobalFieldName: 'isAnyIssueType',
    destinationFieldName: 'issueTypeIds',
  })

const addProjectsToContexts = (instance: InstanceElement, idToContext: Record<string, Values>): void =>
  addPropertyToContexts({
    instance,
    idToContext,
    allPropertiesFieldName: 'contextProjects',
    propertyFieldName: 'projectId',
    isGlobalFieldName: 'isGlobalContext',
    destinationFieldName: 'projectIds',
  })

const addCascadingOptionsToOptions = (instance: InstanceElement): void => {
  instance.value.contexts
    ?.filter((context: Values) => context.options !== undefined)
    .forEach((context: Values) => {
      const idToOption = _.keyBy(context.options, option => option.id)

      const invalidCascadeOptionIds = new Set(
        context.options
          .filter((option: Values) => option.optionId !== undefined && idToOption[option.optionId] === undefined)
          .map((option: Values) => option.id),
      )

      if (invalidCascadeOptionIds.size > 0) {
        log.error(`Invalid optionId found in instance ${instance.elemID.getFullName()} under context ${context.id}`)
        context.options = context.options.filter((option: Values) => !invalidCascadeOptionIds.has(option.id))
      }

      context.options
        .filter((option: Values) => option.optionId !== undefined)
        .forEach((option: Values) => {
          if (idToOption[option.optionId].cascadingOptions === undefined) {
            idToOption[option.optionId].cascadingOptions = {}
          }
          idToOption[option.optionId].cascadingOptions[naclCase(option.value)] = {
            ..._.omit(option, 'optionId'),
            position: Object.keys(idToOption[option.optionId].cascadingOptions).length,
          }
        })

      context.options = context.options.filter((option: Values) => option.optionId === undefined)
    })
}

const transformOptionsToMap = (instance: InstanceElement): void => {
  instance.value.contexts
    ?.filter((context: Values) => context.options !== undefined)
    .forEach((context: Values) => {
      const optionsWithIndex = context.options.map((option: Values, position: number) => ({
        ...option,
        position: position + 1,
      }))

      context.options = _.keyBy(optionsWithIndex, option => {
        if (option.value === '') {
          return '@'
        }
        return naclCase(option.value)
      })
    })
}

const getServiceIds = (instanceValues: Values, type: ObjectType, config: JiraConfig): ServiceIds | undefined => {
  const { serviceIdField } = configUtils.getConfigWithDefault(
    config.apiDefinitions.types[type.elemID.name].transformation,
    config.apiDefinitions.typeDefaults.transformation,
  )

  return serviceIdField !== undefined
    ? elementUtils.createServiceIds({ entry: instanceValues, serviceIDFields: [serviceIdField], typeID: type.elemID })
    : undefined
}

const createContextInstance = (
  context: Values,
  contextType: ObjectType,
  parentField: InstanceElement,
  config: JiraConfig,
  getElemIdFunc?: ElemIdGetter,
): InstanceElement => {
  const contextName =
    generateInstanceNameFromConfig(context, contextType.elemID.typeName, config.apiDefinitions) ?? context.id

  const defaultName = naclCase([parentField.elemID.name, contextName].join('_'))

  const serviceIds = getServiceIds(context, contextType, config)
  const instanceName = getElemIdFunc && serviceIds ? getElemIdFunc(JIRA, serviceIds, defaultName).name : defaultName

  return new InstanceElement(
    instanceName,
    contextType,
    context,
    parentField.path && [...parentField.path, 'contexts', pathNaclCase(instanceName)],
    {
      [CORE_ANNOTATIONS.PARENT]: [new ReferenceExpression(parentField.elemID, parentField)],
    },
  )
}

/**
 * Converts the field structure to what expected structure of the deployment endpoints and
 * converts list with hidden values to maps
 */
const filter: FilterCreator = ({ config, getElemIdFunc }) => ({
  name: 'fieldStructureFilter',
  onFetch: async (elements: Element[]) => {
    const types = _(elements)
      .filter(isObjectType)
      .keyBy(element => element.elemID.name)
      .value()

    const fieldType = types[FIELD_TYPE_NAME]
    const fieldContextType = types[FIELD_CONTEXT_TYPE_NAME]
    const fieldContextDefaultValueType = types[FIELD_CONTEXT_DEFAULT_TYPE_NAME]
    const fieldContextOptionType = types[FIELD_CONTEXT_OPTION_TYPE_NAME]

    const missingTypes = [
      fieldType === undefined ? FIELD_TYPE_NAME : undefined,
      fieldContextType === undefined ? FIELD_CONTEXT_TYPE_NAME : undefined,
      fieldContextDefaultValueType === undefined ? FIELD_CONTEXT_DEFAULT_TYPE_NAME : undefined,
      fieldContextOptionType === undefined ? FIELD_CONTEXT_OPTION_TYPE_NAME : undefined,
    ].filter(values.isDefined)

    if (missingTypes.length) {
      log.warn(`Missing types for field structure filter: ${missingTypes.join(', ')}, skipping`)
      return
    }

    fieldType.fields.type = new Field(fieldType, 'type', BuiltinTypes.STRING)
    delete fieldType.fields.contextDefaults
    delete fieldType.fields.contextProjects
    delete fieldType.fields.contextIssueTypes

    fieldContextType.fields.projectIds = new Field(fieldContextType, 'projectIds', new ListType(BuiltinTypes.STRING))
    fieldContextType.fields.issueTypeIds = new Field(
      fieldContextType,
      'issueTypeIds',
      new ListType(BuiltinTypes.STRING),
    )
    fieldContextType.fields.defaultValue = new Field(fieldContextType, 'defaultValue', fieldContextDefaultValueType)
    fieldContextType.fields.options = new Field(fieldContextType, 'options', new MapType(fieldContextOptionType))

    fieldContextOptionType.fields.position = new Field(fieldContextOptionType, 'position', BuiltinTypes.NUMBER)
    fieldContextOptionType.fields.cascadingOptions = new Field(
      fieldContextOptionType,
      'cascadingOptions',
      new MapType(fieldContextOptionType),
    )

    elements
      .filter(isInstanceElement)
      .filter(instance => instance.elemID.typeName === FIELD_TYPE_NAME)
      .forEach(instance => {
        if (instance.value.isLocked === false) {
          delete instance.value.isLocked
        }

        addTypeValue(instance)

        const idToContext = _.keyBy(instance.value.contexts ?? [], context => context.id)

        addDefaultValuesToContexts(instance, idToContext)
        addIssueTypesToContexts(instance, idToContext)
        addProjectsToContexts(instance, idToContext)

        addCascadingOptionsToOptions(instance)
        transformOptionsToMap(instance)

        const contexts = (instance.value.contexts ?? []).map((context: Values) =>
          createContextInstance(context, fieldContextType, instance, config, getElemIdFunc),
        )

        delete instance.value.contexts
        if (instance.path !== undefined) {
          instance.path = [...instance.path, instance.path[instance.path.length - 1]]
        }

        elements.push(...contexts)
      })
  },
})

export default filter
