# Improving Microservice Reliability in the Cloud - 2023-01-10

## Overview
- Tech talk was given for the Waterford Tech Meetup on the 2023-01-10
- The talk covers some techniques used increase reliability between microservices that communicate with each other.
- The talk mainly focuses on HTTP communication between microservices, and briefly covers how the concepts can be applied to SDKS such as the AWS SDK.
- This repository contains the code that was used throughout the talk.

## Positive Weighting on Retry Attempts
The server code increases the chance of a successful request every time a request is retried. Why? Wouldn't this always result in a good outcome for the demos?

Yes, but what needs to be considered is the following. The demonstration code is trying to simulate how a typical AWS network behaves in production. In production if a network error occurs on the AWS network, and the request is retried, the chances of success increase tenfold. The AWS network usually has random blips where the network is unstable, it is generally never fully down. If the demo server did not increase the chances of success on request retry attempts, then the demonstration would be simulating an AWS network which is extremely unstable, or a server which is extremely unstable. That is not the reality of things when communicating on a typical cloud network when services are operating and stable.

If the AWS region or the server you are using in production is down or extremely unstable, the network requests will more than likely still fail, as the network or server can not handle any requests at all. In these cases you should always have a fail over plan, to either replace the unstable server or move to another AWS region.

## Presentation Slides
[Google Slides](https://docs.google.com/presentation/d/1XAGKrj7cO-HUH8WlKjSQT9YLycb14TI8bzt2qdWdttw/edit?usp=sharing) 
