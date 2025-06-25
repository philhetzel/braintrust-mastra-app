# Evals through the SDK Workshop

## Background

This project is meant to go beyond the Braintrust documentation to show how to perform evaluations outside of "Hello, World!" style examples. This repository is a Next.js chatbot application which uses a [Mastra](https://mastra.ai/en/docs) agent and workflow to get the weather of a location and then deliver suggested activities.

The Mastra agent has three two tools available to it:
- A tool that fetches the weather from an API for a given location.
- A tool that wraps around a [Mastra workflow](https://mastra.ai/en/docs/workflows/overview) which uses the [Tavily API](https://docs.tavily.com/welcome) to do a search and pull back interesting things to do based upon the city and weather.
- A tool that uses a prompt to gather two nearby cities.

Braintrust is performing logging and tracing on the Agent and associated tools. Engineers can run Braintrust Evals through the `evals/conversation.eval.ts` file.

A diagram of the Agent:

![Mastra Agent Diagram](assets/MastraApp.png)


## Getting Started
### Prerequisites
When running this example, you will need to provide the following to the `.env` file:
- **OpenAI_API_KEY**: An OpenAI API Key. Used for LLM calls
- **TAVILY_API_KEY**: A Tavily API Key. Used for the search tool.
- **BRAINTRUST_API_KEY**: A Braintrust API Key. Used to interact with Braintrust for observability and evaluation.
- **BRAINTRUST_PROJECT_NAME**: A unique Braintrust project name (e.g., "YourName_MastraApp"). Used to host your Braintrust assets.

### Setting up the development environment

#### Alter your `.env` file
Make sure that your `.env` file has values for the four environment variables listed above

#### Run the Next.js app
To run the application, use the following command line script:

```bash
npm run dev
```
#### Open the application
Open [http://localhost:3000/test](http://localhost:3000/test) with your browser to see the result.

#### Setup necessary Braintrust assets

You'll need to configure a Braintrust project and Braintrust dataset. This repository provides a convenience script to perform these actions

```bash
npm run setup
```





