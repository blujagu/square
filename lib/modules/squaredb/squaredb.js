/**
 * Copyright (c) 2015 Scott Bishop
 * BluJagu, LLC - www.blujagu.com
 * MIT License (MIT) - This header must remain intact.
 **/
define(['util', 'comparator', 'Select'], function (util, comparator, Select) {
    'use strict';

    var Table = function (db, tableName) {
        // set prototype on the instance when `new Table()`
        // set prototype on constructor on instantiation
        this.__proto__ = {
            '_db': db,
            '_event': db._event + '.' + tableName,
            'constructor': this,
            'columns': function () {
                var cols = [], prop;

                for (prop in this) {
                    if (this.hasOwnProperty(prop)) {
                        cols.push(prop);
                    }
                }

                return cols;
            },
            'count': function () {
                var len = this.indices().length,
                    db = this._db;

                if (db.dispatch) {
                    db.dispatch(this._event + '.count.read', {
                        value: len
                    });
                }

                return len;
            },
            'indices': function () {
                var indices = [],
                    col, prop, i = 0, len;

                for (prop in this) {
                    if (this.hasOwnProperty(prop)) {
                        col = this[prop];
                        for (len = col.length; i < len; ++i) {
                            if (col[i] !== null) {
                                indices.push(i);
                            }
                        }
                        return indices;
                    }
                }

                return indices;
            },
            'holes': function () {
                var holes = [],
                    col, prop, i = 0, len;

                for (prop in this) {
                    if (this.hasOwnProperty(prop)) {
                        col = this[prop];
                        for (len = col.length; i < len; ++i) {
                            if (col[i] === null) {
                                holes.push(i);
                            }
                        }
                        return holes;
                    }
                }

                return holes;
            }
        };

        if (!this.prototype) {
            Object.defineProperty(this, 'prototype', {
                enumerable: false,
                configurable: false,
                value: this.__proto__
            });
        }

        return this;
    };

    var Column = function (table, columnName) {
        this.__proto__ = {
            '_event': table && columnName && table._event + '.' + columnName,
            '_db': table && table._db,
            '_table': table,
            'push': function (x) {
                var db = this._db,
                    pushed = Array.prototype.push.call(this, x);

                if (db.dispatch) {
                    db.dispatch(this._event + '.create', {
                        value: x,
                        index: this.length - 1
                    });
                    this._table.count();
                }

                return pushed;
            },
            'insert': function (x, ndx) {
                var db = this._db;

                this[ndx] = x;
                if (db.dispatch) {
                    db.dispatch(this._event + '.' + ndx + '.update', {
                        value: x,
                        index: ndx
                    });
                }
            }
        };

        if (!this.prototype) {
            Object.defineProperty(this, 'prototype', {
                enumerable: false,
                configurable: false,
                value: this.__proto__
            });

            this.prototype.__proto__ = Array.prototype;
        }

        return this;
    };

    var _memory = {},
        getColumnNames = function (/*columns*/) {
            var columnNames = Array.from(arguments);

            if (columnNames.length === 1) {
                    columnNames = columnNames[0];
                    if (columnNames.indexOf(',') !== -1) {
                        columnNames = columnNames.split(',').map(function (el) {
                            return el.trim();
                        });
                    }
                if (columnNames instanceof Array === false) {
                    columnNames = [columnNames];
                }
            }

            return columnNames;
        },
        Where = function (table, column, operator, control) {
            this.validIndices = comparator(table[column], operator, control);
            this.AND = this.and = function (column, operator, control) {
                var newIndices = comparator(table[column], operator, control);

                this.validIndices = this.validIndices.filter(function (v) {
                    return newIndices.indexOf(v) !== -1;
                });

                return this;
            };
            this.OR = this.or = function (column, operator, control) {
                var cache = [];

                this.validIndices = this.validIndices.concat(comparator(table[column], operator, control));

                this.validIndices = this.validIndices.filter(function (v) {
                    if (cache.indexOf(v) === -1) {
                        cache.push(v);
                        return true;
                    }
                });

                return this;
            };
        };

    _memory.__proto__ = {
        'create': function (dbName) {
            var db = new DB(dbName);

            this[dbName] = db;

            return db;
        },
        'drop': function (dbName) {
            if (this[dbName]) {
                this[dbName] = null;
                delete this[dbName];

                return true;
            }

            return false;
        },
        'get': function (dbName) {
            return this[dbName];
        },
        'show': function () {
            var prop, arr = [];

            for (prop in this) {
                if (this.hasOwnProperty(prop)) {
                    arr.push(prop);
                }
            }

            return arr;
        }
    };

    var DB = function DB (dbName) {
        this.__proto__ = {
            '_event': dbName,
            '_tableCount': 0,
            'count': function () {
                var count =  this._tableCount;

                if (this.dispatch) {
                    this.dispatch(this._event + '.count.read', {
                        value: count
                    });
                }
                return count;
            },
            'COUNT': function () {
                return this.count.call(this);
            },
            'select': function (/*selects*/) {
                var selects = getColumnNames.apply(null, arguments);

                return new Select(this, selects);
            },
            'SELECT': function (/*selects*/) {
                return this.select.apply(this, arguments);
            },
            'createTable': function (tableName) {
                /**
                 * createTable adds a new Table Object <tableName> to the DB Object
                 * @param {String} tableName Name to assign to the new table
                 * @returns {Function} Returns a curried function waiting for the columns argument
                 */
                var db = this,
                    table = new Table(db, tableName);

                db[tableName] = table;

                if (db.dispatch) {
                    db.dispatch(this._event + '.create', {
                        value: table
                    });
                }

                ++this._tableCount;
                this.count();

                return function (/*columns*/) {
                    var columns = getColumnNames.apply({}, arguments);

                    if (columns.length) {
                        db.alterTable(tableName).add.apply({}, arguments);
                    }

                    return table;
                };
            },
            'CREATE_TABLE': function (tableName) {
                return this.createTable.call(this, tableName);
            },
            'alterTable': function (tableName) {
                var table = this[tableName];

                return {
                    'add': function (/*columns*/) {
                        var cols = getColumnNames.apply(null, arguments),
                            col, i = 0, len = cols.length,
                            indices = table.indices(),
                            holes = table.holes(),
                            j = 0, jLen = indices.length,
                            newColumn, db = table._db;

                        for (i; i < len; ++i) {
                            col = cols[i];
                            newColumn = table[col] = new Column(table, col);
                            for (j = 0; j < jLen; ++j) {
                                newColumn.insert(undefined, indices[j]);
                            }
                            jLen = holes.length;
                            for (j = 0; j < jLen; ++j) {
                                newColumn.insert(null, holes[j]);
                            }
                            if (db.dispatch) {
                                db.dispatch(table._event + '.create', {
                                    value: newColumn
                                });
                            }
                        }

                        return table;
                    },
                    'ADD': function (/*columns*/) {
                        return this.add.apply(this, arguments);
                    },
                    'drop': function (/*columns*/) {
                        var cols = getColumnNames.apply(null, arguments),
                            col, i = 0, len, db = table._db;

                        if (cols.length === 0 || cols[0] === '*') {
                            cols = table.columns();
                        }

                        for (len = cols.length; i < len; ++i) {
                            col = cols[i];
                            table[col] = null;
                            delete table[col];
                            if (db.dispatch) {
                                db.dispatch(table._event + '.delete', {
                                    value: col
                                });
                            }
                        }

                        return table;
                    },
                    'DROP': function (/*columns*/) {
                        return this.drop.apply(this, arguments);
                    },
                    'modify': function () {
                        // only needed if I support data types on columns
                    }
                }
            },
            'ALTER_TABLE': function (tableName) {
                return this.alterTable.call(this, tableName);
            },
            'insertInto': function (tableName) {
                var table = this[tableName];

                return function (/*columns*/) {
                    var columns = getColumnNames.apply({}, arguments),
                        values = function (/*insertValues*/) {
                            var vals = Array.from(arguments),
                                column, columnName, val, i = 0, len = columns.length;

                            for (i; i < len; ++i) {
                                columnName = columns[i];
                                val = vals[i];
                                column = table[columnName];
                                column.push(val);
                            }

                            for (columnName in table) {
                                if (table.hasOwnProperty(columnName)) {
                                    if (columns.indexOf(columnName) === -1) {
                                        // all columns in the table that did not get a value set should be set to undefined
                                        table[columnName].push(undefined);
                                    }
                                }
                            }

                            return values;
                        };

                    return {
                        'values': values,
                        'VALUES': values
                    };
                };
            },
            'INSERT_INTO': function (tableName) {
                return this.insertInto.call(this, tableName);
            },
            'insertJsonInto': function (tableName) {
                var table = this[tableName],
                    db = this;

                return function (insertObjects /*[objects]*/) {
                    var prop, insert, columnNames, add, vals,
                        i =0, len = insertObjects.length,
                        tableName = table._event.substr(table._event.indexOf('.') + 1),
                        insertToColumns = db.insertInto(tableName);

                    for (i; i < len; ++i) {
                        insert = insertObjects[i];
                        columnNames = [];
                        vals = [];
                        for (prop in insert) {
                            if (insert.hasOwnProperty(prop)) {
                                if (!table[prop]) {
                                    db.alterTable(tableName).add(prop);
                                }
                                columnNames.push(prop);
                                vals.push(insert[prop]);
                            }
                        }
                        add = insertToColumns.apply(null, columnNames);
                        add.values.apply(null, vals);
                    }
                };
            },
            'INSERT_JSON_INTO': function (tableName) {
                this.insertJsonInto.call(this, tableName);
            },
            'update': function (tableName) {
                var table = this[tableName],
                    db = table._db,
                    updateMap = {},
                    set = function (column, value) {
                        updateMap[column] = value;

                        return set;
                    };

                set.WHERE = set.where = function (column, operator, control) {
                    var w = new Where(table, column, operator, control);

                    w.GO = w.go = function () {
                        var i = 0, len = this.validIndices.length, ndx, prop, val, crud = '.update' ;

                        for (i; i < len; ++i) {
                            ndx = this.validIndices[i];
                            for (prop in table) {
                                if (table.hasOwnProperty(prop) && updateMap[prop]) {
                                    val = updateMap[prop];
                                    table[prop][ndx] = val;
                                    if (db.dispatch) {
                                        if (val === null) {
                                            crud = '.delete';
                                        }
                                        db.dispatch(table._event + '.' + prop + crud, {
                                            value: val,
                                            index: ndx
                                        });
                                    }
                                }
                            }
                        }

                        return true;
                    };

                    return w;
                };

                return {
                    'set': set,
                    'SET': set
                }
            },
            'UPDATE': function (tableName) {
                return this.update.call(this, tableName);
            },
            'delete': function (/*columnNames*/) {
                var columns = getColumnNames.apply({}, arguments),
                    db = this,
                    table,
                    from = function (tableName) {
                        table = db[tableName];
                        if (columns.length === 0 || columns[0] === '*') {
                            columns = table.columns();
                        }

                        return {
                            'where': where,
                            'WHERE': where,
                            'go': go,
                            'GO': go
                        }
                    },
                    go = function () {
                        var matches = this.validIndices,
                            i = 0, len, ndx, j, colLen = columns.length, column;

                        if (matches === undefined) {
                            matches = table.indices();
                            // table.indices gives all possible matches
                        }

                        for (i, len = matches.length; i < len; ++i) {
                            ndx = matches[i];
                            for (j = 0; j < colLen; ++j) {
                                column = table[columns[j]];
                                column.insert(null, ndx);
                                if (db.dispatch) {
                                    db.dispatch(column._event + '.' + ndx + '.delete', {
                                        value: null,
                                        index: ndx
                                    });
                                    --table._tableCount;
                                    table.count();
                                }
                            }
                        }

                        return true;
                    },
                    where = function (column, operator, control) {
                        var w = new Where(table, column, operator, control);

                        w.GO = w.go = go.bind(w);

                        return w;
                    };

                return {
                    'from': from,
                    'FROM': from
                };
            },
            'DELETE': function (/*columnNames*/) {
                return this.delete.apply(this, arguments);
            },
            'createUnique': function () {
                var tsa = new Date().getTime().toString().split(''),
                    abc = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j'],
                    i = 0, len = tsa.length, rtn = [], n, a;

                for (; i < len; ++i) {
                    n = tsa[i];
                    a = abc[n];
                    if (i % 2 === 0) {
                        if (i % 8 === 4) {
                            a = a.toUpperCase();
                        }
                        rtn.push(a);
                    } else {
                        rtn.push(n);
                    }
                }

                rtn = rtn.map(function (v) {
                    switch (v) {
                        case '0': return 'O';
                        case '1': return 'I';
                        case '2': return 'R';
                        case '3': return 'E';
                        case '4': return 'F';
                        case '5': return 'S';
                        case '6': return 'b';
                        case '7': return 'L';
                        case '8': return 'B';
                        case '9': return 'q';
                        default: return v;
                    }
                });

                return rtn.join('');
            },
            restore: function (backup, dbName) {
                var i,  len, path, insert, table, columns,
                    tableName = '',
                    tempArray,
                    reg = new RegExp(dbName + '\\.(\.+)');

                for (path in backup) {
                    if (backup.hasOwnProperty(path)) {
                        tableName = path.match(reg)[1];
                        table = backup[path];
                        columns = Object.keys(backup[path]);
                        this.createTable(tableName)(columns);
                        len = table[columns[0]].length;
                        insert = this.insertInto(tableName)(columns);
                        for (i = 0; i < len; ++i) {
                            tempArray = [];
                            columns.forEach(function (column) {
                                tempArray.push(table[column][i]);
                            });
                            insert.values.apply(this, tempArray);
                        }
                    }
                }
            }
        };

        if (!this.prototype) {
            Object.defineProperty(this, 'prototype', {
                enumerable: false,
                configurable: false,
                value: this.__proto__
            });
        }

        return this;
    };

    return {
        'createDB': _memory.create,
        'CREATE_DATABASE': _memory.create,
        'dropDB': _memory.drop,
        'DROP_DATABASE': _memory.drop,
        'use': _memory.get,
        'USE': _memory.get,
        'show': _memory.show,
        'SHOW_DATABASES': _memory.show
    };
});
