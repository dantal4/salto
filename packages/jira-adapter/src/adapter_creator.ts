/*
 * Copyright 2025 Salto Labs Ltd.
 * Licensed under the Salto Terms of Use (the "License");
 * You may not use this file except in compliance with the License.  You may obtain a copy of the License at https://www.salto.io/terms-of-use
 *
 * CERTAIN THIRD PARTY SOFTWARE MAY BE CONTAINED IN PORTIONS OF THE SOFTWARE. See NOTICE FILE AT https://github.com/salto-io/salto/blob/main/NOTICES
 */
import _ from 'lodash'
import { logger } from '@salto-io/logging'
import { InstanceElement, Adapter, Values } from '@salto-io/adapter-api'
import { client as clientUtils, config as configUtils, definitions } from '@salto-io/adapter-components'
import JiraClient from './client/client'
import JiraAdapter from './adapter'
import { Credentials, basicAuthCredentialsType } from './auth'
import { configType, JiraConfig, getApiDefinitions, getDefaultConfig, validateJiraFetchConfig } from './config/config'
import { createConnection, validateCredentials } from './client/connection'
import { SCRIPT_RUNNER_API_DEFINITIONS } from './constants'
import { configCreator } from './config_creator'
import ScriptRunnerClient from './client/script_runner_client'
import { getCustomReferences } from './weak_references'

const log = logger(module)
const { createRetryOptions, DEFAULT_RETRY_OPTS, DEFAULT_TIMEOUT_OPTS } = clientUtils
const { validateClientConfig, mergeWithDefaultConfig } = definitions
const { validateSwaggerApiDefinitionConfig, validateDuckTypeApiDefinitionConfig } = configUtils

const credentialsFromConfig = (config: Readonly<InstanceElement>): Credentials => config.value as Credentials

function validateConfig(config: Values, isDataCenter: boolean): asserts config is JiraConfig {
  const { client, apiDefinitions, fetch, scriptRunnerApiDefinitions, jsmApiDefinitions } = config

  validateClientConfig('client', client)
  if (!_.isPlainObject(apiDefinitions)) {
    throw new Error('Missing apiDefinitions from configuration')
  }
  // Note - this is a temporary way of handling multiple swagger defs in the same adapter
  // this will be replaced by built-in infrastructure support for multiple swagger defs
  // in the configuration
  Object.values(getApiDefinitions(apiDefinitions)).forEach(swaggerDef => {
    validateSwaggerApiDefinitionConfig('apiDefinitions', swaggerDef)
  })
  if (isDataCenter) {
    if (fetch.enableJSM || fetch.enableJSMPremium || fetch.enableJsmExperimental) {
      log.error('JSM is not supported in Jira DC config')
      throw new Error(
        'Failed to load Jira config. JSM is not supported for Jira DC, please remove enableJSM flag from the config file and try again\n' +
          'More information about Jira configuration options in Salto can be found here: https://github.com/salto-io/salto/blob/main/packages/jira-adapter/config_doc.md',
      )
    }
  }
  validateJiraFetchConfig({
    fetchConfig: fetch,
    apiDefinitions,
    scriptRunnerApiDefinitions,
    jsmApiDefinitions,
  })
  if (scriptRunnerApiDefinitions !== undefined) {
    validateDuckTypeApiDefinitionConfig(SCRIPT_RUNNER_API_DEFINITIONS, scriptRunnerApiDefinitions)
  }
}

const adapterConfigFromConfig = (
  config: Readonly<InstanceElement> | undefined,
  defaultConfig: JiraConfig,
  isDataCenter: boolean,
): JiraConfig => {
  const configWithoutFetch = mergeWithDefaultConfig(
    _.omit(defaultConfig, 'fetch'),
    _.omit(config?.value ?? {}, 'fetch'),
  )
  const fetch = _.defaults({}, config?.value.fetch, defaultConfig.fetch)
  const fullConfig = { ...configWithoutFetch, fetch }

  validateConfig(fullConfig, isDataCenter)

  // Hack to make sure this is coupled with the type definition of JiraConfig
  const adapterConfig: Record<keyof Required<JiraConfig>, null> = {
    apiDefinitions: null,
    client: null,
    fetch: null,
    deploy: null,
    masking: null,
    scriptRunnerApiDefinitions: null,
    jsmApiDefinitions: null,
    customReferences: null,
  }
  Object.keys(fullConfig)
    .filter(k => !Object.keys(adapterConfig).includes(k))
    .forEach(k => log.debug('Unknown config property was found: %s', k))

  return fullConfig
}

export const adapter: Adapter = {
  operations: context => {
    const isDataCenter = Boolean(context.credentials.value.isDataCenter)
    const defaultConfig = getDefaultConfig({ isDataCenter })
    const config = adapterConfigFromConfig(context.config, defaultConfig, isDataCenter)
    const credentials = credentialsFromConfig(context.credentials)
    const client = new JiraClient({
      credentials,
      config: config.client,
      isDataCenter,
    })
    const scriptRunnerClient = new ScriptRunnerClient({
      credentials: {},
      config: config.client,
      isDataCenter,
      jiraClient: client,
    })
    const adapterOperations = new JiraAdapter({
      client,
      config,
      getElemIdFunc: context.getElemIdFunc,
      elementsSource: context.elementsSource,
      configInstance: context.config,
      scriptRunnerClient,
    })

    return {
      deploy: adapterOperations.deploy.bind(adapterOperations),
      fetch: async args => adapterOperations.fetch(args),
      deployModifiers: adapterOperations.deployModifiers,
      fixElements: adapterOperations.fixElements.bind(adapterOperations),
    }
  },
  validateCredentials: async config => {
    const connection = createConnection(createRetryOptions(DEFAULT_RETRY_OPTS, DEFAULT_TIMEOUT_OPTS))
    const creds = credentialsFromConfig(config)

    return validateCredentials({
      connection: await connection.login(creds),
      credentials: creds,
    })
  },
  authenticationMethods: {
    basic: {
      credentialsType: basicAuthCredentialsType,
    },
  },
  configType,
  configCreator,
  getCustomReferences,
}
