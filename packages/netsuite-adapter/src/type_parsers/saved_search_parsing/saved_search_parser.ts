/*
 * Copyright 2025 Salto Labs Ltd.
 * Licensed under the Salto Terms of Use (the "License");
 * You may not use this file except in compliance with the License.  You may obtain a copy of the License at https://www.salto.io/terms-of-use
 *
 * CERTAIN THIRD PARTY SOFTWARE MAY BE CONTAINED IN PORTIONS OF THE SOFTWARE. See NOTICE FILE AT https://github.com/salto-io/salto/blob/main/NOTICES
 */
import { Values } from '@salto-io/adapter-api'
import { collections } from '@salto-io/lowerdash'
import _ from 'lodash'
import { ElementCompact } from 'xml-js'
import { SAVED_SEARCH } from '../../constants'
import {
  ElementParts,
  AttributeObject,
  RecordObject,
  getJson,
  getElementDependency,
  getObjectFromValues,
  getFlags,
  extractRecordsValues,
  getDefinitionOrLayout,
} from '../report_types_parser_utils'
import { ParsedSavedSearchType } from './parsed_saved_search'

type FilterObject = {
  descriptor?: {
    values?: {
      Value?: AttributeObject[]
    }
  }
  values?: {
    values?: {
      Record?: RecordObject | RecordObject[]
    }
  }
}

const getFilterRecords = (filter: FilterObject | undefined): Values[] =>
  collections.array.makeArray(filter?.values?.values?.Record).map(record => getObjectFromValues(record?.values?.Value))

const getFilter = (filter: FilterObject | undefined): Values => {
  const parsedFilter = getObjectFromValues(filter?.descriptor?.values?.Value)
  const records = getFilterRecords(filter)
  return {
    ...parsedFilter,
    ...(!_.isEmpty(records) ? { RECORDS: records } : {}),
  }
}

const extractSearchDefinitionValues = (search: ElementCompact | undefined): Values[] =>
  collections.array.makeArray(search?.values?.SearchFilter).map(getFilter)

const getAudience = (search: ElementCompact[]): Values => {
  const record = collections.array.makeArray(search).filter(i => Object.keys(i).includes('Record'))[0]
  return record === undefined ? [] : getObjectFromValues(record.Record?.values?.Value)
}

const getAlertRecipients = (search: ElementCompact | undefined): Values[] =>
  collections.array
    .makeArray(search?.alertRecipientFields?.values?.Record)
    .map((record: RecordObject) => getObjectFromValues(record?.values?.Value))

const getSearchPartsFromDefinition = async (definition: string): Promise<ElementParts> => {
  const parsedXml = await getJson(definition)
  return {
    definition: getDefinitionOrLayout(parsedXml, SAVED_SEARCH),
    dependency: getElementDependency(parsedXml),
  }
}

export const parseDefinition = async (definition: string): Promise<ParsedSavedSearchType> => {
  const searchParts = await getSearchPartsFromDefinition(definition)
  const returnInstance = {
    search_filter: extractSearchDefinitionValues(searchParts.definition?.filters),
    search_summary_filters: extractSearchDefinitionValues(searchParts.definition?.summaryFilters),
    available_filters: extractRecordsValues(searchParts.definition?.availableFilterFields),
    return_fields: extractRecordsValues(searchParts.definition?.returnFields),
    detail_fields: extractRecordsValues(searchParts.definition?.detailFields),
    sort_columns: extractRecordsValues(searchParts.definition?.sortColumns),
    audience: getAudience(searchParts.dependency),
    alert_recipients: getAlertRecipients(searchParts.definition),
  }
  return { ..._.omitBy(returnInstance, _.isEmpty), ...getFlags(searchParts.definition) }
}
