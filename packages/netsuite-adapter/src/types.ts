/*
*                      Copyright 2022 Salto Labs Ltd.
*
* Licensed under the Apache License, Version 2.0 (the "License");
* you may not use this file except in compliance with
* the License.  You may obtain a copy of the License at
*
*     http://www.apache.org/licenses/LICENSE-2.0
*
* Unless required by applicable law or agreed to in writing, software
* distributed under the License is distributed on an "AS IS" BASIS,
* WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
* See the License for the specific language governing permissions and
* limitations under the License.
*/
import { DeployResult as AdapterApiDeployResult, Element, InstanceElement, isInstanceElement, ObjectType, PrimitiveType, TypeElement, TypeReference } from '@salto-io/adapter-api'
import { fieldTypes } from './types/field_types'
import { enums } from './autogen/types/enums'
import { CustomType, getCustomTypes, isCustomTypeName } from './autogen/types'
import { TypesMap } from './types/object_types'
import { fileCabinetTypesNames, getFileCabinetTypes } from './types/file_cabinet_types'

export const isCustomType = (type: ObjectType | TypeReference): boolean =>
  isCustomTypeName(type.elemID.name)

export const isFileCabinetType = (type: ObjectType | TypeReference): boolean =>
  fileCabinetTypesNames.has(type.elemID.name)

export const isFileCabinetInstance = (element: Element): element is InstanceElement =>
  isInstanceElement(element) && isFileCabinetType(element.refType)

export const isFileInstance = (element: Element): boolean =>
  isInstanceElement(element) && element.refType.elemID.name === 'file'

export const isDataObjectType = (element: ObjectType): boolean =>
  element.annotations.source === 'soap'

type MetadataTypes = {
  customTypes: TypesMap<CustomType>
  enums: Readonly<Record<string, PrimitiveType>>
  fileCabinetTypes: Readonly<Record<string, ObjectType>>
  fieldTypes: Readonly<Record<string, PrimitiveType>>
}

export const getMetadataTypes = (): MetadataTypes => ({
  customTypes: getCustomTypes(),
  enums,
  fileCabinetTypes: getFileCabinetTypes(),
  fieldTypes,
})

export const getTopLevelCustomTypes = (customTypes: TypesMap<CustomType>): ObjectType[] =>
  Object.values(customTypes).map(customType => customType.type)

export const getInnerCustomTypes = (customTypes: TypesMap<CustomType>): ObjectType[] =>
  Object.values(customTypes).flatMap(customType => Object.values(customType.innerTypes))

export const metadataTypesToList = (metadataTypes: MetadataTypes): TypeElement[] => {
  const { customTypes, fileCabinetTypes } = metadataTypes
  return [
    ...getTopLevelCustomTypes(customTypes),
    ...getInnerCustomTypes(customTypes),
    ...Object.values(enums),
    ...Object.values(fileCabinetTypes),
    ...Object.values(fieldTypes),
  ]
}

export const SCRIPT_TYPES = [
  'bundleinstallationscript',
  'clientscript',
  'scheduledscript',
  'workflowactionscript',
  'suitelet',
  'mapreducescript',
  'massupdatescript',
  'usereventscript',
  'restlet',
  'sdfinstallationscript',
  'portlet',
  'customrecordactionscript',
]

export const PLUGIN_IMPLEMENTATION_TYPES = [
  'emailcaptureplugin',
  'customglplugin',
  'datasetbuilderplugin',
  'bankstatementparserplugin',
  'ficonnectivityplugin',
  'fiparserplugin',
  'promotionsplugin',
  'workbookbuilderplugin',
  'pluginimplementation',
]

export const FIELD_TYPES = [
  'entitycustomfield',
  'transactionbodycustomfield',
  'transactioncolumncustomfield',
  'itemcustomfield',
  'othercustomfield',
  'itemoptioncustomfield',
  'itemnumbercustomfield',
  'crmcustomfield',
  'customfield',
]

export type DeployResult = AdapterApiDeployResult & {
  elemIdToInternalId?: Record<string, string>
}

export const CONFIG_RECORD_TYPES = [
  'USER_PREFERENCES',
  'COMPANY_INFORMATION',
  'COMPANY_PREFERENCES',
  'ACCOUNTING_PREFERENCES',
] as const

export type ConfigRecordType = typeof CONFIG_RECORD_TYPES[number]

export const CONFIG_TYPES_TO_TYPE_NAMES: Record<ConfigRecordType, string> = {
  USER_PREFERENCES: 'config_userpreferences',
  COMPANY_INFORMATION: 'config_companyinformation',
  COMPANY_PREFERENCES: 'config_companypreferences',
  ACCOUNTING_PREFERENCES: 'config_accountingpreferences',
}

export const CONFIG_TYPE_NAMES = Object.values(CONFIG_TYPES_TO_TYPE_NAMES)

export const isConfigInstance = (instance: InstanceElement): boolean =>
  CONFIG_TYPE_NAMES.includes(instance.elemID.typeName)
