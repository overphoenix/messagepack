import SmartBuffer from "@recalibratedsystems/smartbuffer";
import Encoder from "./encoder";
import Decoder from "./decoder";
import { BufferType, EncoderInfo, DecoderInfo, DecodeFunction, EncodeFunction } from "./types";

export default class Serializer {
  private encodingTypes: EncoderInfo[] = [];
  private decodingTypes: DecoderInfo[] = [];

  public encoder = new Encoder(this.encodingTypes);
  public decoder = new Decoder(this.decodingTypes);

  constructor(private initialCapacity = 64) {
  }

  registerEncoder(type: number, check: any, encode: EncodeFunction): Serializer {
    this.encodingTypes.push({ type, check, encode });
    return this;
  }

  registerDecoder(type: number, decode: DecodeFunction): Serializer {
    this.decodingTypes.push({ type, decode });
    return this;
  }

  register(type: number, constructor: any, encode: EncodeFunction, decode: DecodeFunction): Serializer {
    if (type < 0 || type > 127) {
      throw new RangeError(`Bad type: 0 <= ${type} <= 127`);
    }
    this.registerEncoder(type, (obj: any) => {
      return (obj instanceof constructor);
    }, (obj: any) => {
      const extBuf = new SmartBuffer(this.initialCapacity, true);
      encode(obj, extBuf);
      return extBuf;
    });
    this.registerDecoder(type, decode);

    return this;
  }

  encode(x: any, buf?: BufferType) {
    return this.encoder.encode(x, buf);
  }

  decode(buf: BufferType) {
    return this.decoder.decode(buf);
  }
}