/**
 * Copyright (c) 2015 Scott Bishop
 * SquareDB - www.squaredb.com
 * MIT License (MIT) - This header must remain intact.
 **/
define(['./aggregates', './comparator'], function (aggregates, comparator) {
    'use strict';

    var go = function (queryObject) {
        var o = queryObject,
            db = o.db,
            table = o.table,
            distinct = o.distinct,
            selects = o.selects,
            where = o.where,
            len = selects.length || 1,
            returnArrays = {},
            aggregateStore = {},
            getAllColumns = function () {
                selects = Object.keys(table);
                len = selects.length;
                columnName = selects[0];
            },
            aggregate, regExpMatches, validIndices, newIndices,
            response, select, columnName, column, initial,
            i, j, jLen, and, andi, or, ori, ndx, prop;

        for (i = 0; i < len; ++i) {
            columnName = selects[i];
            // remove any quotes that were used to denote strings
            columnName = columnName.replace(/['"]/g, '');
            // is the column name wrapped in an aggregate?
            if (columnName.indexOf('(') !== -1) {
                regExpMatches = columnName.match(/^(\w+)\(([^\)]+)\)/);
                columnName = regExpMatches[2];
                if (columnName === '*') {
                    getAllColumns();
                }
                aggregateStore[columnName] = regExpMatches[1];
            }
            // is this column aliased?
            // todo: enable aliases
            if (columnName.indexOf(' as ') !== -1) {
                columnName = columnName.replace(/(^\w+)\sas\s\w+/, '$1');
            }
            if (columnName === '*') {
                getAllColumns();
            }
            column = table[columnName] || [];
            returnArrays[columnName] = column.filter(function (v) {
                return v !== null;
            });
            validIndices = table.indices();
        }

        if (where) {
            initial = where.initial;
            or = where.or;
            and = where.and;
            // process initial
            validIndices = comparator(table[initial[0]], initial[1], initial[2]);
            // process ORs
            if (or.length) {
                for (i = 0, len = or.length; i < len; ++i) {
                    ori = or[i];
                    newIndices = comparator(table[ori[0]], ori[1], ori[2]);
                    for (j = 0, jLen = newIndices.length; j < jLen; ++j) {
                        ndx = newIndices[j];
                        if (validIndices.indexOf(ndx) === -1) {
                            validIndices.push(ndx);
                        }
                    }
                }
            }
            // process ANDs
            if (and.length) {
                for (i = 0, len = and.length; i < len; ++i) {
                    andi = and[i];
                    newIndices = comparator(table[andi[0]], andi[1], andi[2]);
                    validIndices = validIndices.filter(function (v) {
                        return this.indexOf(v) !== -1;
                    }.bind(newIndices));
                }
            }

            // reduce columns to only validIndices
            returnArrays = makeValid(returnArrays, validIndices);
        }

        if (distinct) {
            validIndices = getDistinctIndices(returnArrays[distinct]);
            response = makeValid(returnArrays, validIndices);
        } else {
            response = returnArrays;
        }

        // process aggregates
        for (columnName in aggregateStore) {
            if (aggregateStore.hasOwnProperty(columnName)) {
                aggregate = aggregateStore[columnName];
                response = aggregates(response, aggregate, columnName);
            }
        }

        response = toJsonArray(response);

        if (aggregate) {
            response = response[0];
        }

        if (db.dispatch) {
            // process model events
            for (i = 0, len = response.length; i < len; ++i) {
                select = response[i];
                ndx = validIndices[i];
                for (prop in select) {
                    if (select.hasOwnProperty(prop)) {
                        db.dispatch(table._event + '.' + prop + '.' + ndx + '.read', {
                            value: select[prop]
                        });
                    }
                }
            }
        }

        return response;
    };

    var makeValid = function (returnArrays, validIndices) {
        var columnName;

        for (columnName in returnArrays) {
            if (returnArrays.hasOwnProperty(columnName)) {
                returnArrays[columnName] = returnArrays[columnName].filter(function (v, i) {
                    return validIndices.indexOf(i) !== -1;
                });
            }
        }

        return returnArrays;
    };

    var getDistinctIndices = function (a) {
        var cache = [], keep = [];

        a.filter(function (v, i) {
            if (cache.indexOf(v) === -1 && v !== null) {
                cache.push(v);
                keep.push(i);
                return true;
            }
        });

        return keep;
    };

    var toJsonArray = function (returnArrays) {
        var arr = [], columnName, column, len, i;

        for (columnName in returnArrays) {
            if (returnArrays.hasOwnProperty(columnName)) {
                column = returnArrays[columnName];
                len = column.length;
                for (i = 0; i < len; ++i) {
                    if (!arr[i]) {
                        arr[i] = {};
                    }
                    arr[i][columnName] = column[i];
                }
            }
        }

        return arr;
    };

    return go;
});