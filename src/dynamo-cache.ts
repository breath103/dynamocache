import * as AWS from "aws-sdk";

export class DynamoCache {
  readonly namespace: string;
  readonly timeToLiveAttributeName: string;
  readonly dynamoDBClient: AWS.DynamoDB;
  constructor(options: {
    namespace: string,
    timeToLiveAttributeName?: string,
  }) {
    this.namespace = options.namespace;
    this.timeToLiveAttributeName = options.timeToLiveAttributeName || "expires_at";
    this.dynamoDBClient = new AWS.DynamoDB();
  }

  // DynamoDB Configurations
  get tableName() {
    return `${this.namespace}_cache`;
  }
  async createTable() {
    console.log(`Creating table <${this.tableName}> ...`);
    const table = await new Promise<AWS.DynamoDB.CreateTableOutput>((resolve, reject) => {
      this.dynamoDBClient.createTable({
        AttributeDefinitions: [
          {
            AttributeName: "key",
            AttributeType: "S",
          },
        ],
        TableName: this.tableName,
        KeySchema: [
          {
            AttributeName: "key",
            KeyType: "HASH",
          },
        ],
        ProvisionedThroughput: {
          ReadCapacityUnits: 1,
          WriteCapacityUnits: 1,
        },
      }, (err, data: AWS.DynamoDB.CreateTableOutput) => {
        if (err) {
          reject(err);
        } else {
          resolve(data);
        }
      });
    });
    console.log(`Table <${this.tableName}> Created.`);

    console.log(`Update Table <${this.tableName}> for TTL <${this.timeToLiveAttributeName}>`);
    await new Promise((resolve, reject) => {
      this.dynamoDBClient.updateTimeToLive({
        TableName: this.tableName,
        TimeToLiveSpecification: {
          Enabled: true,
          AttributeName: this.timeToLiveAttributeName,
        },
      }, (err, data: AWS.DynamoDB.UpdateTimeToLiveOutput) => {
        if (err) {
          reject(err);
        } else {
          resolve(data);
        }
      });
    });
  }
  async deleteTable() {
    await new Promise<AWS.DynamoDB.CreateTableOutput>((resolve, reject) => {
      this.dynamoDBClient.deleteTable(
        { TableName: this.tableName },
        (err, data: AWS.DynamoDB.DeleteTableOutput) => {
          if (err) {
            reject(err);
          } else {
            resolve(data);
          }
        })
    });
  }

  // Access
  accessor<T>(type: SerializableClass<T>) {
    return new DynamoCacheSerializableAccessor(this, type);
  }

  async get<T>(key: string): Promise<T | undefined> {
    const res = await new Promise<AWS.DynamoDB.GetItemOutput>((resolve, reject) => {
      this.dynamoDBClient.getItem({
        TableName: this.tableName,
        Key: {
          key: {
            S: key,
          }
        }
      }, (err: AWS.AWSError, data: AWS.DynamoDB.GetItemOutput) => {
        if (err) {
          reject(err);
        } else {
          resolve(data);
        }
      });
    });
    if (res.Item && res.Item["value"] && res.Item["value"]["S"]) {
      return JSON.parse(res.Item["value"]["S"]!) as T;
    } else {
      return undefined;
    }
  }

  async set<T>(key: string, options: CacheSetOption, data: T): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      const item: AWS.DynamoDB.PutItemInputAttributeMap = {
        key: {
          S: key,
        },
        value: {
          S: JSON.stringify(data),
        }
      };
      item[this.timeToLiveAttributeName] = {
        N: (new Date().getTime() + options.expiresIn).toString(),
      }

      this.dynamoDBClient.putItem({
        TableName: this.tableName,
        Item: item
      }, (err: AWS.AWSError, data: AWS.DynamoDB.GetItemOutput) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  async fetch<T>(key: string, options: CacheSetOption, fetcher: () => Promise<T>): Promise<T> {
    let value: T | undefined = await this.get<T>(key);
    if (!value) {
      value = await fetcher();
      await this.set(key, options, value);
    }
    return value;
  }
}

export interface CacheSetOption {
  // Expires in seconds
  expiresIn: number;
}

export interface SerializableClass<Type> {
  new(): Type;
  fromJSON(object: object): Type;
  toJSON(): object;
}

export class DynamoCacheSerializableAccessor<T> {
  constructor(private cache: DynamoCache, private type: SerializableClass<T>) {
  }

  async get(key: string): Promise<T | undefined> {
    const json = this.cache.get<string>(key);
    if (json) {
      return this.type.fromJSON(json);
    } else {
      return undefined;
    }
  }

  async set(key: string, options: CacheSetOption, data: T): Promise<void> {
    return this.cache.set(key, options, data);
  }

  async fetch(key: string, options: CacheSetOption, fetcher: () => Promise<T>): Promise<T> {
    return this.cache.fetch(key, options, fetcher);
  }
}
