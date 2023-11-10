import { NgZone } from "@angular/core";
import * as pb from "optic/protos/ui_ts_proto_pb/protos/ui_pb";

// TODO: set this as environmental variable
const DEV_SERVER_HOST = "http://127.0.0.1:8080";

interface InitParams {
  zone: NgZone;
  onRender: (rootComponent: pb.Component) => void;
}

export class ChannelService {
  private eventSource: EventSource;
  private initParams: InitParams;
  constructor() {
    this.eventSource = new EventSource(DEV_SERVER_HOST + "/ui");
  }

  init(initParams: InitParams) {
    const { zone, onRender } = initParams;
    this.initParams = initParams;

    this.eventSource.onmessage = (e) => {
      if (e.data == "<stream_end>") {
        this.eventSource.close();
        return;
      }
      // Looks like Angular has a bug where it's not intercepting EventSource onmessage.
      zone.run(() => {
        console.log(e.data);
        const array = toUint8Array(atob(e.data));
        const serverEvent = pb.ServerEvent.deserializeBinary(array);
        switch (serverEvent.getTypeCase()) {
          case pb.ServerEvent.TypeCase.RENDER:
            onRender(serverEvent.getRender()!.getRootComponent()!);
            break;
          case pb.ServerEvent.TypeCase.TYPE_NOT_SET:
            throw new Error("Unhandled case for server event: " + serverEvent);
        }
      });
    };
  }

  dispatch(request: pb.UiRequest) {
    const array = request.serializeBinary();

    const byteString = btoa(fromUint8Array(array));
    const url = DEV_SERVER_HOST + "/ui?request=" + byteString;
    this.eventSource.close();
    this.eventSource = new EventSource(url);
    this.init(this.initParams);
  }
}

function fromUint8Array(array: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < array.length; i++) {
    binary += String.fromCharCode(array[i]);
  }
  return binary;
}

function toUint8Array(byteString: string): Uint8Array {
  const byteArray = new Uint8Array(byteString.length);
  for (let i = 0; i < byteString.length; i++) {
    byteArray[i] = byteString.charCodeAt(i);
  }
  return byteArray;
}