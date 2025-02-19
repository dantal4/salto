/*
 * Copyright 2025 Salto Labs Ltd.
 * Licensed under the Salto Terms of Use (the "License");
 * You may not use this file except in compliance with the License.  You may obtain a copy of the License at https://www.salto.io/terms-of-use
 *
 * CERTAIN THIRD PARTY SOFTWARE MAY BE CONTAINED IN PORTIONS OF THE SOFTWARE. See NOTICE FILE AT https://github.com/salto-io/salto/blob/main/NOTICES
 */
import { createAdapter, credentials, client, filters, fetch as fetchUtils } from '@salto-io/adapter-components'
import { Credentials, credentialsType } from './auth'
import { DEFAULT_CONFIG, UserConfig } from './config'
import { createConnection } from './client/connection'
import { ADAPTER_NAME } from './constants'
import { createClientDefinitions, createDeployDefinitions, createFetchDefinitions } from './definitions'
import { PAGINATION } from './definitions/requests/pagination'
import { Options } from './definitions/types'
import { REFERENCES } from './definitions/references'
import { customConvertError } from './error_utils'
import transformTemplateBodyToTemplateExpressionFilterCreator from './filters/transform_template_body_to_template_expression'
import customPathsFilterCreator from './filters/custom_paths'
import deploySpaceAndPermissionsFilterCreator from './filters/deploy_space_and_permissions'
import createChangeValidator from './change_validator'
import groupsAndUsersFilterCreator from './filters/groups_and_users_filter'

const { RATE_LIMIT_UNLIMITED_MAX_CONCURRENT_REQUESTS } = client
const { defaultCredentialsFromConfig } = credentials

export const adapter = createAdapter<Credentials, Options, UserConfig>({
  adapterName: ADAPTER_NAME,
  authenticationMethods: {
    basic: {
      credentialsType,
    },
  },
  defaultConfig: DEFAULT_CONFIG,
  definitionsCreator: ({ clients, userConfig }) => ({
    clients: createClientDefinitions(clients),
    pagination: PAGINATION,
    fetch: createFetchDefinitions(userConfig),
    deploy: createDeployDefinitions(),
    references: REFERENCES,
  }),
  operationsCustomizations: {
    connectionCreatorFromConfig: () => createConnection,
    credentialsFromConfig: defaultCredentialsFromConfig,
    customizeFilterCreators: args => ({
      groupsAndUsersFilterCreator,
      // deploySpaceAndPermissionsFilterCreator should run before default deploy filter
      deploySpaceAndPermissionsFilterCreator: deploySpaceAndPermissionsFilterCreator(args),
      ...filters.createCommonFilters<Options, UserConfig>(args),
      // transform template body must run after references are created (fieldReferencesFilter)
      transformTemplateBodyToTemplateExpressionFilterCreator,
      // customPathsFilterCreator must run after fieldReferencesFilter
      customPathsFilterCreator,
    }),
    additionalChangeValidators: createChangeValidator,
  },

  initialClients: {
    main: undefined,
    users_client: undefined,
  },

  clientDefaults: {
    rateLimit: {
      total: RATE_LIMIT_UNLIMITED_MAX_CONCURRENT_REQUESTS,
      get: 60,
      deploy: 2,
    },
  },
  customConvertError,
  allCriteria: {
    name: fetchUtils.query.nameCriterion,
    status: fetchUtils.query.fieldCriterionCreator('status'),
    type: fetchUtils.query.fieldCriterionCreator('type'),
  },
})
