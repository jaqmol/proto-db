ProtoDB
=======

#### In-browser persistence DB with beautiful API – cast into AngularJS

With IndexedDB modern browsers get a reliable cross-platform storage technique. Unfortunately the API is cumbersome. ProtoDB aims to fix that, under the following corner points:

1. **Greatly simplify the usage of IndexedDB.**
2. **Don't compromise debugability.**
3. **Cover all features.**

> ProtoDB is a lean layer around the IndexedDB. While keeping most of wording and concept, it offers with the following comforts:
- **transactions** are completely **abstracted away**
- **single data items and arrays** thereof are **treated alike** 
- **asynchronous behavior** is implemented with **JS promises**
- **data migration/upgrades** between versions of your database is **greatly simplified.**

Code is organized as a AngularJS module. If you're unhappy with that, go make a fork. I'll be happy to help, just drop me a line.

-----

#### Table of contents

[Concept explained](#concept-explained)

###### Configuration
[Configure databases](#configure-databases) | [Configure object stores](#configure-object-stores) | [Upgrade object stores](#upgrade-object-stores) | [Configure indexes](#configure-indexes) | [Accessing data in object stores](#accessing-data-in-object-stores) | [Getting an object store](#getting-an-object-store)

###### References
**[Object store API reference](#object-store-api-reference)** | [all](#osall) | [index](#osindex) | [count](#oscount) | [add](#osadd) | [clear](#osclear) | [delete](#osdelete) | [get](#osget) | [put](#osput) | [forEach](#osforeach) | [map](#osmap) | [filter](#osfilter)
  
**[Indexes API reference](#indexes-api-reference)** | [all](#idxall) | [forEach](#idxforeach) | [map](#idxmap) | [filter](#idxfilter) | [IndexResult](#indexresult)
  
[ToDo](#todo)

[MIT License](#mit-license)

-----

### First things first: check if ProtoDB can be used

```javascript
ProtoDB.supported();
```
Checks if IndexedDB is supported by the browser.

**RETURNS:** `true` if ProtoDB can be used.

-----

## Concept explained

Data **objects/items** are stored **in object stores**. Each **object store** is **part of** a **database**. Each **database** can **house several object stores**. An application can **create several databases per domain.** The **object stores** are the **central means of storing and retrieving** data objects. Properties known to be searched for often, can be configured to be kept in **indexes, to optimize performance.**

In all the former regards ProtoDB sticks to IndexedDB, keeping it **thin** and **lightweight.**

## Configure databases

For the impatient: Jump to [full configuration example](#full-configuration-example), but please make sure you understood how to [access data in object stores](#accessing-data-in-object-stores).

```javascript
ProtoDB.configDatabase({
	name: <database-name>, 
	version: <database-version>
});
```
**ARGUMENTS:** Called with **one object** sporting following details:

| Key       | Value type | Description                                                                                    |
|:----------|:-----------|:-----------------------------------------------------------------------------------------------|
| `name`    | *String*   | The name of the database. Must take form of a valid JS identifier (no keywords, no operators). |
| `version` | *Integer*  | The version int of the DB. Floats or strings are not supported. Increment to trigger upgrades. |

After a database is configured with a certain name it becomes accessable as a property of the `ProtoDB` service. If you named your DB `addressBook`, you can access it by invoking `ProtoDB.addressBook`.

**RETURNS:** a database accessor object.

#### Database accessor

Next to the names of already configured object stores as properties the database accessor sports only one method `configObjectStore(...)`, which returns the database accessor.

## Configure object stores

```javascript
ProtoDB
	.configDatabase({ ... })
	.configObjectStore({
		name: <object-store-name>,
		keyPath: <keypath-to-object-store-primary-key>
	})
	.configObjectStore({...});
```
Note how you can chain calls to `configObjectStore(...)`.

**ARGUMENTS:** Called with **one object** sporting following details:

###### Required

| Key       | Value type | Description                                                                                        |
|:----------|:-----------|:---------------------------------------------------------------------------------------------------|
| `name`    | *String*   | The name of the object store. Must take form of a valid JS identifier (no keywords, no operators). |
| `keyPath` | *String*   | The key path to the primary key. Property-names separated by dots. MUST BE UNIQUE!                 |

###### Optional

| Key             | Value type  | Description                                                                                                                                 |
|:----------------|:------------|:--------------------------------------------------------------------------------------------------------------------------------------------|
| `autoIncrement` | *Boolean*   | If set to true, primary key assignment will be performed automatically in case none is found.                                               |
| `upgradeMapper` | *Function*  | A mapping function that get's called with complete object store content during database upgrade. Return the transformed object from within. |
| `indexes`       | *Array*     | Configure indexes. [Read more](#configure-indexes)                                                                                          |

**RETURNS:** The database accessor object related to the database. Making chaining of calls possible.

After an object store is configured with a certain name it becomes accessable as a property of it's database. If you named your DB `addressBook` and your object store `contacts`, you can access it by invoking `ProtoDB.addressBook.contacts`.

## Upgrade object stores

To make changes object-store-wide, use an upgrade mapper function. It allows for transformations of complete object store contents.

```javascript
ProtoDB
	.configDatabase({ ... })
	.configObjectStore({
		<...>
		upgradeMapper: function(item) {
			<...>
			return <transformed-item>;
		}
	});
```
**Note** that an upgrade is only triggered when you increment the database version and then operate on one of its object stores. Upgrades are furthermore only performed once per version.

**ARGUMENTS:** One data object at a time.

**RETURNS:** A transformed data object.

## Configure indexes

```javascript
ProtoDB
	.configDatabase({ ... })
	.configObjectStore({
		<...>
		indexes: [
			{keyPath: <keypath-to-property-to-be-indexed>},
			<...>
		]
	});
```
The `indexes` property mus be an array carrying configuration settings. Please keep in mind that indexes come with a housekeeping cost, at time of writing to the store.

The following configuration settings can be made:

###### Required

| Key       | Value type | Description                                                                       |
|:----------|:-----------|:----------------------------------------------------------------------------------|
| `keyPath` | *String*   | The key path to a property of the data objects. Property-names separated by dots. |

###### Optional

| Key          | Value type | Description                                                                                                                                            |
|:-------------|:-----------|:-------------------------------------------------------------------------------------------------------------------------------------------------------|
| `unique`     | *Boolean*  | The key path to a property of the data objects. Property-names separated by dots.                                                                      |
| `multiEntry` | *Boolean*  | Specifies behavior if the key-path points to an array. [Consult MDN for details](https://developer.mozilla.org/en-US/docs/Web/API/IDBIndex/multiEntry) |

### Full configuration example

```javascript
ProtoDB.configDatabase({
	name: 'mailApp', 
	version: 1
	
}).configObjectStore({
	name: 'contacts',
	keyPath: 'id',
	upgradeMapper: function(contact) {
		contact.name = {
			first: contact.firstName,
			last: contact.lastName
		};
		delete contact.firstName;
		delete contact.lastName;
		return contact;
	},
	indexes: [
		{keyPath: 'name.first'},
		{keyPath: 'name.last'}
	]
	
}).configObjectStore({
	name: 'emails',
	keyPath: 'id',
	autoIncrement: true,
	indexes: [
		{keyPath: 'subject'},
		{keyPath: 'from'},
		{keyPath: 'to', multiEntry: true}
	]
});
```

-----

### Accessing data in object stores

**Please note** that **before any object store can be accessed, databases and object stores have to be configured** in order to have the necessary properties created for us. This process **must occur first and foremost.**

**Please furthermore note** that the **actual process of configuring** the underlying **IndexedDB** is **performed** event-driven: **at** the **time of** your **first operation on** a specific version of a **database.** The **process** is **performed** only **once per version** and can be **triggered on purpose by increasing** the **version number.**

### Getting an object store

Consider you configured a database named `addressBook` and on it an object store called `contacts`. Access it as shown in the following example:

```javascript
ProtoDB.addressBook.contacts.<call-API-methods>
```

## Object store API reference

## *os.*all
*property*

```javascript
<object-store>.all
```

Retrieve all data objects in the object store.

**RETURNS:** A promise ($q) resolving with an array of data objects.

###### Example

```javascript
ProtoDB.addressBook.contacts.all
	.then(function(allContacts) {
		// do something with allContacts
	})
	.catch(function(err) {
		// handle error
	});
```

## *os.*index
*method*

```javascript
<object-store>.index(<index-name>)
```

Retrieve an IndexHelper instance for further operations on an index.

**ARGUMENTS:** The name of the index.

**RETURNS:** A promise ($q) resolving with an IndexHelper instance.

###### Example

```javascript
ProtoDB.addressBook.contacts.index('email')
	.filter(function(value, primaryKey, stopper) {
		return value.indexOf('tom') > -1;
	})
	.then(function(result) {
		return ProtoDB.addressBook.contacts.get(result.primaryKeys);
	})
	.then(function(allToms) {
		// do something with allToms
	})
	.catch(function(err) {
		// handle error
	});
```

## *os.*count
*method*

```javascript
<object-store>.count()
```

Count all objects in this specific store.

**ARGUMENTS:** none.

**RETURNS:** A promise ($q) resolving with an integer value.

###### Example

```javascript
ProtoDB.addressBook.contacts.count()
	.then(function(contactsCount) {
		// do something with contactsCount
	})
	.catch(function(err) {
		// handle error
	});
```

## *os.*add
*method*

```javascript
<object-store>.add(<data-object-or-array-of-data-objects>)
```

Adds new objects to the store. Rejects with an error if an object with the same primaryKey value already exists.

**ARGUMENT:** A data object or an array of data objects.

**RETURNS:** ~~A promise ($q) resolving with one or many primaryKey values of the added object(s).~~

###### Example

```javascript
ProtoDB.addressBook.contacts.add(newJack)
	.then(function(newJacksID) {
		// do something with newJacksID
	})
	.catch(function(err) {
		// handle error
	});
```

## *os.*clear
*method*

```javascript
<object-store>.clear()
```

Clears all data from the object store.

**ARGUMENT:** None.

**RETURNS:** ~~A promise ($q) resolving with RESOLVEVALUE.~~

###### Example

```javascript
ProtoDB.addressBook.contacts.clear()
	.then(function() {
		// success
	})
	.catch(function(err) {
		// handle error
	});
```

## *os.*delete
*method*

```javascript
<object-store>.delete(<primary-key-value-or-array-of-them>)
```

Delete one or many data objects.

**ARGUMENT:** A primary key value or an array of them.

**RETURNS:** ~~A promise ($q) resolving with RESOLVEVALUE.~~

###### Example

```javascript
ProtoDB.addressBook.contacts.delete(jacksID)
	.then(function(RESOLVEVALUE) {
		// do something with RESOLVEVALUE
	})
	.catch(function(err) {
		// handle error
	});
```

## *os.*get
*method*

```javascript
<object-store>.get(<a-primary-key-value-or-array-of-them>)
```

Retrieve one or many data items from the object store.

**ARGUMENT:** A primary key value or an array thereof.

**RETURNS:** A promise ($q) resolving with the item found or an array of items found.

###### Example

```javascript
ProtoDB.addressBook.contacts.get(tomsID)
	.then(function(tomsContact) {
		// do something with tomsContact
	})
	.catch(function(err) {
		// handle error
	});
```

## *os.*put
*method*

```javascript
<object-store>.put(<data-object-or-array-thereof>)
```

Puts one or many items into the object store. Already existing items with the same primary key value are replaced.

**ARGUMENT:** One data item or an array of them.

**RETURNS:** ~~A promise ($q) resolving with RESOLVEVALUE.~~

###### Example

```javascript
ProtoDB.addressBook.contacts.put(tomsContact)
	.then(function(RESOLVEVALUE) {
		// do something with RESOLVEVALUE
	})
	.catch(function(err) {
		// handle error
	});
```

## *os.*forEach
*method*

```javascript
<object-store>.forEach(<callback>)
```

Iterates over all items in the store.

**ARGUMENT:** A function taking 2 arguments: The `item` plus a `stopper` object. Set `stopper.stop = true;` to stop the iteration.

**RETURNS:** ~~A promise ($q) resolving with RESOLVEVALUE.~~

###### Example

```javascript
ProtoDB.addressBook.contacts
	.forEach(function(contactItem, stopper) {
		// do something with contactItem
		// or set: stopper.stop = true;
	})
	.then(function(RESOLVEVALUE) {
		// do something with RESOLVEVALUE
	})
	.catch(function(err) {
		// handle error
	});
```

## *os.*map
*method*

```javascript
<object-store>.map(<callback>)
```

Mapping over all object store items.

**ARGUMENT:** A function taking 2 arguments: The `item` plus a `stopper` object. Set `stopper.stop = true;` to stop the iteration. The return value will be collected.

**RETURNS:** A promise ($q) resolving with the mapping of return values of the callback.

###### Example

```javascript
ProtoDB.addressBook.contacts
	.map(function(aContact, stopper) {
		// do something with contactItem
		// or set: stopper.stop = true;
		return hashFromContact(aContact);
	})
	.then(function(contactHashes) {
		// do something with contactHashes
	})
	.catch(function(err) {
		// handle error
	});
```

## *os.*filter
*method*

```javascript
<object-store>.filter(<callback>)
```

Filter object store items with a callback.

**ARGUMENT:** A function taking 2 arguments: The `item` plus a `stopper` object. Set `stopper.stop = true;` to stop the iteration. Collects an `item` if return value is `true`.

**RETURNS:** A promise ($q) resolving with all collected items.

###### Example

```javascript
ProtoDB.addressBook.contacts
	.filter(function(aContact, stopper) {
		return aContact.firstName.toLowerCase().indexOf('tom') > -1;
	})
	.then(function(allToms) {
		// do something with allToms
	})
	.catch(function(err) {
		// handle error
	});
```

## Indexes API reference

Indexes are accessed via a index helper object. Index helpers are obtained by calling the method `ProtoDB.<database>.<object-store>.index('<index-name>')`.

## *idx.*all
*property*

```javascript
<index>.all
```

Obtain all primary keys and values of an index.

**RETURNS:** A promise ($q) resolving with an [IndexResult](#indexresult) instance.

###### Example

```javascript
ProtoDB.addressBook.contacts.index('name.first').all
	.then(function(result) {
		// do something with result
	})
	.catch(function(err) {
		// handle error
	});
```

## *idx.*forEach
*method*

```javascript
<index>.forEach(<callback>)
```

Iterates over all items in index.

**ARGUMENT:** A function taking 3 arguments: `value`, `primaryKey` plus a `stopper` object. Set `stopper.stop = true;` to stop the iteration.

**RETURNS:** A promise ($q) resolving when iteration is complete.

###### Example

```javascript
ProtoDB.addressBook.contacts.index('name.first')
	.forEach(function(name, primaryKey, stopper) {
		// do something with name, primaryKey
		// or set: stopper.stop = true;
	})
	.then(function() {
		// iteration finished
	})
	.catch(function(err) {
		// handle error
	});
```

## *idx.*map
*method*

```javascript
<index>.map(<callback>)
```

Mapping over all items in index.

**ARGUMENT:** A function taking 3 arguments: `value`, `primaryKey` plus a `stopper` object. Set `stopper.stop = true;` to stop the iteration. The return value will be collected.

**RETURNS:** A promise ($q) resolving with the mapping of return values of the callback.

###### Example

```javascript
ProtoDB.addressBook.contacts.index('name.first')
	.map(function(name, primaryKey, stopper) {
		// do something with contactItem
		// or set: stopper.stop = true;
		return hashFromString(name);
	})
	.then(function(nameHashes) {
		// do something with nameHashes
	})
	.catch(function(err) {
		// handle error
	});
```

## *idx.*filter
*method*

```javascript
<index>.filter(<callback>)
```

Filter all items in index with a callback.

**ARGUMENT:** A function taking 3 arguments: `value`, `primaryKey` plus a `stopper` object. Set `stopper.stop = true;` to stop the iteration. Collects result if return value is `true`.

**RETURNS:** A promise ($q) resolving with [IndexResult](#indexresult) instance.

###### Example

```javascript
ProtoDB.addressBook.contacts.index('name.first')
	.filter(function(name, primaryKey, stopper) {
		return name.toLowerCase().indexOf('tom') > -1;
	})
	.then(function(result) {
		return ProtoDB.addressBook.contacts.get(result.primaryKeys);
	})
	.then(function(allToms) {
		// do something with allToms
	})
	.catch(function(err) {
		// handle error
	});
```

## IndexResult
*prototype*

Instances of this prototype sport the following API:

| Member                | Type     | Description                                                                                                                                               |
|:----------------------|:---------|:----------------------------------------------------------------------------------------------------------------------------------------------------------|
| `primaryKeys`         | *Array*  | Primary keys referring to data objects. Call `<object-store>.get(<indexFilterResult>.primaryKeys)` to retrieve all objects at once.                       |
| `values`              | *Array*  | Values as stored in the index. If you only need those values, use them as they come. |
| `forEach(<callback>)` | *Method* | Iterate over primary keys and value. Callback signature: `function (primaryKey, value) { ... };` invoked once per result pair.                            |

## ToDo

- Complete documentation of resolve-with values.
- UnitTests need to be added.
- Means of removing object stores and indexes when no longer needed.
- Other module-systems, i.e. node-style-require.

## MIT License

http://opensource.org/licenses/MIT

The MIT License (MIT)

Copyright (c) 2015 Ronny Reichmann

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
