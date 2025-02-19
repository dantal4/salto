/*
 * Copyright 2025 Salto Labs Ltd.
 * Licensed under the Salto Terms of Use (the "License");
 * You may not use this file except in compliance with the License.  You may obtain a copy of the License at https://www.salto.io/terms-of-use
 *
 * CERTAIN THIRD PARTY SOFTWARE MAY BE CONTAINED IN PORTIONS OF THE SOFTWARE. See NOTICE FILE AT https://github.com/salto-io/salto/blob/main/NOTICES
 */
import { client as clientUtils, definitions } from '@salto-io/adapter-components'
import { logger } from '@salto-io/logging'
import { handleDeploymentErrors } from '../deployment/deployment_error_handling'
import { JIRA } from '../constants'
import { createScriptRunnerConnection } from './script_runner_connection'
import JiraClient, { DELAY_PER_REQUEST_MS, USE_BOTTLENECK } from './client'
import { ScriptRunnerCredentials } from '../auth'

const log = logger(module)

const NO_LICENSE_ERROR_CODE = 402

const { DEFAULT_RETRY_OPTS, DEFAULT_TIMEOUT_OPTS, RATE_LIMIT_UNLIMITED_MAX_CONCURRENT_REQUESTS } = clientUtils

// The below default values are taken from Jira and were not verified for ScriptRunner
const DEFAULT_MAX_CONCURRENT_API_REQUESTS: Required<definitions.ClientRateLimitConfig> = {
  total: RATE_LIMIT_UNLIMITED_MAX_CONCURRENT_REQUESTS,
  get: 60,
  deploy: 2,
}

const DEFAULT_PAGE_SIZE: Required<definitions.ClientPageSizeConfig> = {
  get: 1000,
}

export default class ScriptRunnerClient extends clientUtils.AdapterHTTPClient<
  ScriptRunnerCredentials,
  definitions.ClientRateLimitConfig
> {
  constructor(
    clientOpts: clientUtils.ClientOpts<ScriptRunnerCredentials, definitions.ClientRateLimitConfig> & {
      isDataCenter: boolean
      jiraClient: JiraClient
    },
  ) {
    super(JIRA, clientOpts, createScriptRunnerConnection(clientOpts.jiraClient, clientOpts.isDataCenter), {
      pageSize: DEFAULT_PAGE_SIZE,
      rateLimit: DEFAULT_MAX_CONCURRENT_API_REQUESTS,
      maxRequestsPerMinute: RATE_LIMIT_UNLIMITED_MAX_CONCURRENT_REQUESTS,
      delayPerRequestMS: DELAY_PER_REQUEST_MS,
      useBottleneck: USE_BOTTLENECK,
      retry: DEFAULT_RETRY_OPTS,
      timeout: DEFAULT_TIMEOUT_OPTS,
    })
  }

  public async get(
    args: clientUtils.ClientBaseParams,
  ): Promise<clientUtils.Response<clientUtils.ResponseValue | clientUtils.ResponseValue[]>> {
    try {
      return await super.get({
        ...args,
        headers: {
          ...(args.headers ?? {}),
        },
      })
    } catch (e) {
      // The http_client code catches the original error and transforms it such that it removes
      // the parsed information (like the status code), so we have to parse the string here in order
      // to realize what type of error was thrown
      if (e instanceof clientUtils.HTTPError && e.response?.status === 404) {
        log.warn('Suppressing 404 error %o', e)
        return {
          data: [],
          status: 404,
        }
      }
      if (e instanceof clientUtils.HTTPError && e.response?.status === NO_LICENSE_ERROR_CODE) {
        log.error('Suppressing no license error for scriptRunner %o', e)
        return {
          data: [],
          status: NO_LICENSE_ERROR_CODE,
        }
      }
      throw e
    }
  }

  @handleDeploymentErrors()
  public async sendRequest<T extends keyof clientUtils.HttpMethodToClientParams>(
    method: T,
    params: clientUtils.HttpMethodToClientParams[T],
  ): Promise<clientUtils.Response<clientUtils.ResponseValue | clientUtils.ResponseValue[]>> {
    return super.sendRequest(method, params)
  }
}
