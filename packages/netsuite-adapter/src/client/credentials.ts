/*
 * Copyright 2024 Salto Labs Ltd.
 * Licensed under the Salto Terms of Use (the "License");
 * You may not use this file except in compliance with the License.  You may obtain a copy of the License at https://www.salto.io/terms-of-use
 *
 * CERTAIN THIRD PARTY SOFTWARE MAY BE CONTAINED IN PORTIONS OF THE SOFTWARE. See NOTICE FILE AT https://github.com/salto-io/salto/blob/main/NOTICES
 */
export type SuiteAppCredentials = {
  accountId: string
  suiteAppTokenId: string
  suiteAppTokenSecret: string
  suiteAppActivationKey?: string
}

export type SuiteAppSoapCredentials = Omit<SuiteAppCredentials, 'suiteAppActivationKey'>

export type SdfTokenBasedCredentials = {
  accountId: string
  tokenId: string
  tokenSecret: string
}

export type SdfOauthCredentials = {
  accountId: string
  certificateId: string
  privateKey: string
}

export type SdfCredentials = SdfTokenBasedCredentials | SdfOauthCredentials

export type Credentials = SdfCredentials & Partial<SuiteAppCredentials>

export const isSuiteAppCredentials = (credentials: Credentials): credentials is SdfCredentials & SuiteAppCredentials =>
  credentials.suiteAppTokenId !== undefined && credentials.suiteAppTokenSecret !== undefined

export const isSdfCredentialsOnly = (credentials: Credentials): boolean =>
  credentials.suiteAppTokenId === undefined && credentials.suiteAppTokenSecret === undefined

export const isSdfOauthCredentials = (credentials: SdfCredentials): credentials is SdfOauthCredentials =>
  (credentials as SdfOauthCredentials).certificateId !== undefined

export const toUrlAccountId = (accountId: string): string => accountId.toLowerCase().replace('_', '-')

// accountId must be uppercased as described in https://github.com/oracle/netsuite-suitecloud-sdk/issues/140
export const toCredentialsAccountId = (accountId: string): string => accountId.toUpperCase().replace('-', '_')
