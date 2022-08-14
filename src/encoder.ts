import SmartBuffer from "@recalibratedsystems/smartbuffer";
import { Buffer } from "buffer";
import { BufferType, EncoderInfo } from "./types";
import { isArray, isBuffer, isPlainObject, isString } from "@recalibratedsystems/common";
import { NotSupportedException } from "@recalibratedsystems/common/error";
import typeOf from "@recalibratedsystems/common/typeof";


export default class Encoder {
  constructor(private encodingTypes: EncoderInfo[]) {
  }

  encode(x: any, buf?: BufferType) {
    buf = buf || new SmartBuffer(1024, true);
    this._encode(x, buf);
    return buf;
  }

  private _encode(x, buf) {
    const type = typeof (x);
    switch (type) {
      case "undefined": {
        buf.writeUInt32BE(0xD4000000); // fixext special type/value
        buf.woffset--;
        break;
      }
      case "boolean": {
        (x === true) ? buf.writeInt8(0xC3) : buf.writeInt8(0xC2);
        break;
      }
      case "string": {
        this.encodeString(x, buf);
        break;
      }
      case "number": {
        if (x !== (x | 0)) { // as double
          buf.writeInt8(0xCB);
          buf.writeDoubleBE(x);
        } else if (x >= 0) {
          if (x < 128) {
            buf.writeInt8(x);
          } else if (x < 256) {
            buf.writeInt16BE(0xCC00 | x);
          } else if (x < 65536) {
            buf.writeInt8(0xCD);
            buf.writeUInt16BE(x);
          } else if (x <= 0xFFFFFFFF) {
            buf.writeInt8(0xCE);
            buf.writeUInt32BE(x);
          } else if (x <= 9007199254740991) {
            buf.writeInt8(0xCF);
            buf.writeUInt64BE(x);
          } else { // as double
            buf.writeInt8(0xCB);
            buf.writeDoubleBE(x);
          }
        } else {
          if (x >= -32) {
            buf.writeInt8(0x100 + x);
          } else if (x >= -128) {
            buf.writeInt8(0xD0);
            buf.writeInt8(x);
          } else if (x >= -32768) {
            buf.writeInt8(0xD1);
            buf.writeInt16BE(x);
          } else if (x > -214748365) {
            buf.writeInt8(0xD2);
            buf.writeInt32BE(x);
          } else if (x >= -9007199254740991) {
            buf.writeInt8(0xD3);
            buf.writeInt64BE(x);
          } else { // as double
            buf.writeInt8(0xCB);
            buf.writeDoubleBE(x);
          }
        }
        break;
      }
      default: {
        if (x === null) {
          buf.writeInt8(0xC0);
        } else if (isBuffer(x)) {
          if (x.length <= 0xFF) {
            buf.writeInt16BE(0xC400 | x.length);
          } else if (x.length <= 0xFFFF) {
            buf.writeInt8(0xC5);
            buf.writeUInt16BE(x.length);
          } else {
            buf.writeUInt8(0xC6);
            buf.writeUInt32BE(x.length);
          }
          buf.write(x);
        } else if (isArray(x)) {
          if (x.length < 16) {
            buf.writeInt8(0x90 | x.length);
          } else if (x.length < 65536) {
            buf.writeInt8(0xDC);
            buf.writeUInt16BE(x.length);
          } else {
            buf.writeInt8(0xDD);
            buf.writeUInt32BE(x.length);
          }
          for (const obj of x) {
            this._encode(obj, buf);
          }
        } else if (isPlainObject(x)) {
          const keys = Object.keys(x);

          if (keys.length < 16) {
            buf.writeInt8(0x80 | keys.length);
          } else {
            buf.writeInt8(0xDE);
            buf.writeUInt16BE(keys.length);
          }

          for (const key of keys) {
            this.encodeString(key, buf);
            this._encode(x[key], buf);
          }
        } else { // try extensions
          const encTypes = this.encodingTypes;
          for (let i = 0; i < encTypes.length; ++i) {
            if (encTypes[i].check(x)) {
              const extType: EncoderInfo = encTypes[i];
              const encoded = extType.encode(x);

              const length = encoded.length;
              if (length === 1) {
                buf.writeUInt8(0xD4);
              } else if (length === 2) {
                buf.writeUInt8(0xD5);
              } else if (length === 4) {
                buf.writeUInt8(0xD6);
              } else if (length === 8) {
                buf.writeUInt8(0xD7);
              } else if (length === 16) {
                buf.writeUInt8(0xD8);
              } else if (length < 256) {
                buf.writeUInt16BE(0xC700 | length);
              } else if (length < 0x10000) {
                buf.writeUInt32BE(0xC8000000 | (length << 8));
                buf.woffset -= 1;
              } else {
                buf.writeUInt8(0xC9);
                buf.writeUInt32BE(length);
              }
              buf.writeInt8(extType.type);
              buf.write(encoded);
              return;
            }
          }
          throw new NotSupportedException(`Not supported: ${(x.__proto__ && x.__proto__.constructor && isString(x.__proto__.constructor.name))
            ? x.__proto__.constructor.name
            : typeOf(x)}`);
        }
      }
    }
  }

  private encodeString(x, buf) {
    const len = Buffer.byteLength(x);
    if (len < 32) {
      buf.writeInt8(0xA0 | len);
      if (len === 0) {
        return;
      }
    } else if (len <= 0xFF) {
      buf.writeUInt16BE(0xD900 | len);
    } else if (len <= 0xFFFF) {
      buf.writeInt8(0xDA);
      buf.writeUInt16BE(len);
    } else {
      buf.writeInt8(0xDB);
      buf.writeUInt32BE(len);
    }
    buf.write(x, undefined, len);
  }
}