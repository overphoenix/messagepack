import { Buffer} from "buffer";
import SmartBuffer from "@recalibratedsystems/smartbuffer";

export type EncodeFunction = (obj: any, buf?: Buffer | SmartBuffer) => SmartBuffer;
export type DecodeFunction = (buf: Buffer | SmartBuffer) => any;
export type CheckFunction = (obj: any) => boolean;

export interface EncoderInfo {
  type: number;
  check: CheckFunction;
  encode: EncodeFunction;
}

export interface DecoderInfo {
  type: number;
  decode: DecodeFunction;
}

export type BufferType = Buffer | SmartBuffer;
