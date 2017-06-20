<!--[![Travis Build Status](https://travis-ci.org/breath103/dynamocache.svg?branch=master)](https://travis-ci.org/breath103/dynamocache)
[![npm version](https://badge.fury.io/js/dynamocache.svg)](https://badge.fury.io/js/dynamocache)-->

# DynamoCache
DynamoDB as a key-value cache just like memcached, but much better, fully-managed, auto scalliable, totally reliable.


when we building applications, we often need simple Key-Value cache cluster with millisecond latency, automatic backup, scalable, maximum item size about few KBs.

Traditionally, people uses redis or memcached for this.

and usually, people faces those challenges.
1. Configuring Backup / failover
2. Scale (building cluster with servel nodes)
3. you have to buy a node and pay for it even at 3AM, when node is basically doing nothing, something like $0.266 per hour.
4. Monitoring

Surely, there are some cloud manager services like [AWS elasticsearch](https://aws.amazon.com/elasticsearch-service/) which supports

1. Automatic Backup / failover
2. Scale (with downtime or some data loss)
3. Monitoring, (Cloudwatch)


but you still need to "manage" - "Cluster". as a developer who hates "operating" job, i don't like "cluster", cause you have to love it and care about it, like watching over easily-die plant in my room.
but i just want to focus on writing application.

So i came up with the idea of using DynamoDB as a cache, which is fully-managed, Document based NOSQL DB which support [autoscale](https://aws.amazon.com/blogs/aws/new-auto-scaling-for-amazon-dynamodb/) bulit in, so [you pay as you read / write](https://aws.amazon.com/dynamodb/pricing/)
Also, has now [in-preview Accelerator](https://aws.amazon.com/dynamodb/dax/) which let you obtain "MICROSECOND" latency.

