
import * as Long from "long";
import Serializer from "./serializer";
import { BufferType } from "./types";
import { Exception, createError, getStdErroId } from "@recalibratedsystems/common/error";

export const registerCommonTypesFor = (s) => {
  // Custom types mapping:
  // 127 - ateos exceptions
  // 126 - standart errors
  // 125 - Date
  // 124 - Map
  // 123 - Set
  // 120-122 - reserved
  // 119 - ateos.math.Long
  // 110-118 - reserved for other ateos types
  // 100-109 - reserved for netron types
  // 1-99 - user-defined types

  const decodeException = (buf) => {
    const id = buf.readUInt16BE();
    const stack = s.decode(buf);
    const message = s.decode(buf);
    return createError(id, message, stack);
  };

  // Ateos exceptions should be registered before std errors in case of inheritance from Error class.

  // Ateos exceptions encoders/decoders
  s.register(127, Exception, (obj, buf) => {
    buf.writeUInt16BE(obj.id);
    s.encode(obj.stack, buf);

    // AggregateException case
    if (obj.id === 99) {
      const errors: Error[] = [];
      for (const error of obj._errors) {
        errors.push(error);
      }
      s.encode(errors, buf);
    } else {
      s.encode(obj.message, buf);
    }
  }, decodeException);

  // Std exceptions encoders/decoders
  s.register(126, Error, (obj, buf) => {
    buf.writeUInt16BE(getStdErroId(obj));
    s.encode(obj.stack, buf);
    s.encode(obj.message, buf);
  }, decodeException);

  // Date
  s.register(125, Date, (obj, buf) => {
    buf.writeUInt64BE(obj.getTime());
  }, (buf) => {
    return new Date(buf.readUInt64BE().toNumber());
  });

  // Map
  s.register(124, Map, (obj, buf) => {
    buf.writeUInt32BE(obj.size);
    for (const [key, val] of obj.entries()) {
      s.encode(key, buf);
      s.encode(val, buf);
    }
  }, (buf) => {
    const map = new Map();
    const size = buf.readUInt32BE();
    for (let i = 0; i < size; i++) {
      const key = s.decode(buf);
      const val = s.decode(buf);
      map.set(key, val);
    }
    return map;
  });

  // Set
  s.register(123, Set, (obj, buf) => {
    buf.writeUInt32BE(obj.size);
    for (const val of obj.values()) {
      s.encode(val, buf);
    }
  }, (buf) => {
    const set = new Set();
    const size = buf.readUInt32BE();
    for (let i = 0; i < size; i++) {
      const val = s.decode(buf);
      set.add(val);
    }
    return set;
  });

  // Long encoder/decoder
  s.register(119, Long, (obj, buf) => {
    buf.writeInt8(obj.unsigned ? 1 : 0);
    if (obj.unsigned) {
      buf.writeUInt64BE(obj);
    } else {
      buf.writeInt64BE(obj);
    }
  }, (buf) => {
    const unsigned = Boolean(buf.readInt8());
    return (unsigned ? buf.readUInt64BE() : buf.readInt64BE());
  });
};

export { Serializer };
export const serializer = new Serializer();
registerCommonTypesFor(serializer);

export const encode = (obj: any) => serializer.encode(obj).toBuffer();
export const decode = (buf: BufferType) => serializer.decode(buf);
export const tryDecode = (buf: BufferType) => serializer.decoder.tryDecode(buf);
export const any = true;
