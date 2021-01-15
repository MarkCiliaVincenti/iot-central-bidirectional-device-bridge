/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 *
 * Code generated by Microsoft (R) AutoRest Code Generator.
 * Changes may cause incorrect behavior and will be lost if the code is regenerated.
 */

import * as msRest from "@azure/ms-rest-js";


export const DeviceStatusResponseBody: msRest.CompositeMapper = {
  serializedName: "DeviceStatusResponseBody",
  type: {
    name: "Composite",
    className: "DeviceStatusResponseBody",
    modelProperties: {
      status: {
        serializedName: "status",
        type: {
          name: "String"
        }
      },
      reason: {
        serializedName: "reason",
        type: {
          name: "String"
        }
      }
    }
  }
};

export const DeviceSubscription: msRest.CompositeMapper = {
  serializedName: "DeviceSubscription",
  type: {
    name: "Composite",
    className: "DeviceSubscription",
    modelProperties: {
      deviceId: {
        serializedName: "deviceId",
        type: {
          name: "String"
        }
      },
      subscriptionType: {
        serializedName: "subscriptionType",
        type: {
          name: "String"
        }
      },
      callbackUrl: {
        serializedName: "callbackUrl",
        type: {
          name: "String"
        }
      },
      createdAt: {
        serializedName: "createdAt",
        type: {
          name: "DateTime"
        }
      }
    }
  }
};

export const SubscriptionCreateOrUpdateBody: msRest.CompositeMapper = {
  serializedName: "SubscriptionCreateOrUpdateBody",
  type: {
    name: "Composite",
    className: "SubscriptionCreateOrUpdateBody",
    modelProperties: {
      callbackUrl: {
        required: true,
        serializedName: "callbackUrl",
        type: {
          name: "String"
        }
      }
    }
  }
};

export const DeviceSubscriptionWithStatus: msRest.CompositeMapper = {
  serializedName: "DeviceSubscriptionWithStatus",
  type: {
    name: "Composite",
    className: "DeviceSubscriptionWithStatus",
    modelProperties: {
      deviceId: {
        serializedName: "deviceId",
        type: {
          name: "String"
        }
      },
      subscriptionType: {
        serializedName: "subscriptionType",
        type: {
          name: "String"
        }
      },
      callbackUrl: {
        serializedName: "callbackUrl",
        type: {
          name: "String"
        }
      },
      createdAt: {
        serializedName: "createdAt",
        type: {
          name: "DateTime"
        }
      },
      status: {
        serializedName: "status",
        type: {
          name: "String"
        }
      }
    }
  }
};

export const MessageBody: msRest.CompositeMapper = {
  serializedName: "MessageBody",
  type: {
    name: "Composite",
    className: "MessageBody",
    modelProperties: {
      data: {
        required: true,
        serializedName: "data",
        type: {
          name: "Dictionary",
          value: {
            type: {
              name: "Object"
            }
          }
        }
      },
      properties: {
        serializedName: "properties",
        type: {
          name: "Dictionary",
          value: {
            type: {
              name: "String"
            }
          }
        }
      },
      componentName: {
        serializedName: "componentName",
        type: {
          name: "String"
        }
      },
      creationTimeUtc: {
        serializedName: "creationTimeUtc",
        type: {
          name: "DateTime"
        }
      }
    }
  }
};

export const RegistrationBody: msRest.CompositeMapper = {
  serializedName: "RegistrationBody",
  type: {
    name: "Composite",
    className: "RegistrationBody",
    modelProperties: {
      modelId: {
        serializedName: "modelId",
        type: {
          name: "String"
        }
      }
    }
  }
};

export const ReportedPropertiesPatch: msRest.CompositeMapper = {
  serializedName: "ReportedPropertiesPatch",
  type: {
    name: "Composite",
    className: "ReportedPropertiesPatch",
    modelProperties: {
      patch: {
        required: true,
        serializedName: "patch",
        type: {
          name: "Dictionary",
          value: {
            type: {
              name: "Object"
            }
          }
        }
      }
    }
  }
};

export const GetTwinOKResponseTwinProperties: msRest.CompositeMapper = {
  serializedName: "GetTwinOKResponse_twin_properties",
  type: {
    name: "Composite",
    className: "GetTwinOKResponseTwinProperties",
    modelProperties: {
      desired: {
        serializedName: "desired",
        type: {
          name: "Object"
        }
      },
      reported: {
        serializedName: "reported",
        type: {
          name: "Object"
        }
      }
    }
  }
};

export const GetTwinOKResponseTwin: msRest.CompositeMapper = {
  serializedName: "GetTwinOKResponse_twin",
  type: {
    name: "Composite",
    className: "GetTwinOKResponseTwin",
    modelProperties: {
      properties: {
        serializedName: "properties",
        type: {
          name: "Composite",
          className: "GetTwinOKResponseTwinProperties"
        }
      }
    }
  }
};

export const GetTwinOKResponse: msRest.CompositeMapper = {
  serializedName: "GetTwinOKResponse",
  type: {
    name: "Composite",
    className: "GetTwinOKResponse",
    modelProperties: {
      twin: {
        serializedName: "twin",
        type: {
          name: "Composite",
          className: "GetTwinOKResponseTwin"
        }
      }
    }
  }
};