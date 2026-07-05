import "server-only";
import { speckleGraphql, SPECKLE_SERVER_URL } from "@/lib/speckle/client";

export type SpeckleProjectSummary = {
  id: string;
  name: string;
  description: string | null;
  updatedAt: string;
  modelCount: number;
};

export type SpeckleModelSummary = {
  id: string;
  name: string;
  updatedAt: string;
  previewUrl: string | null;
};

export type SpeckleVersion = {
  id: string;
  message: string | null;
  referencedObject: string;
  createdAt: string;
  sourceApplication: string | null;
  authorName: string | null;
};

const PROJECT_SUMMARY_QUERY = /* GraphQL */ `
  query ProjectSummary($id: String!) {
    project(id: $id) {
      id
      name
      description
      updatedAt
      models(limit: 1) {
        totalCount
      }
    }
  }
`;

/** Fetches summary info for a specific set of project IDs (the ones a client org is allowed to see). */
export async function getProjectSummaries(projectIds: string[]): Promise<SpeckleProjectSummary[]> {
  const results = await Promise.allSettled(
    projectIds.map((id) =>
      speckleGraphql<{ project: {
        id: string; name: string; description: string | null; updatedAt: string;
        models: { totalCount: number };
      } | null }>(PROJECT_SUMMARY_QUERY, { id }),
    ),
  );

  const summaries: SpeckleProjectSummary[] = [];
  for (const result of results) {
    if (result.status === "fulfilled" && result.value.project) {
      const p = result.value.project;
      summaries.push({
        id: p.id,
        name: p.name,
        description: p.description,
        updatedAt: p.updatedAt,
        modelCount: p.models.totalCount,
      });
    }
  }
  return summaries;
}

const PROJECT_WITH_MODELS_QUERY = /* GraphQL */ `
  query ProjectWithModels($id: String!) {
    project(id: $id) {
      id
      name
      description
      updatedAt
      models(limit: 100) {
        totalCount
        items {
          id
          name
          updatedAt
          previewUrl
        }
      }
    }
  }
`;

export async function getProjectWithModels(projectId: string) {
  const data = await speckleGraphql<{
    project: {
      id: string;
      name: string;
      description: string | null;
      updatedAt: string;
      models: { totalCount: number; items: SpeckleModelSummary[] };
    } | null;
  }>(PROJECT_WITH_MODELS_QUERY, { id: projectId });

  return data.project;
}

const MODEL_VERSIONS_QUERY = /* GraphQL */ `
  query ModelVersions($projectId: String!, $modelId: String!) {
    project(id: $projectId) {
      id
      name
      model(id: $modelId) {
        id
        name
        versions(limit: 50) {
          totalCount
          items {
            id
            message
            referencedObject
            createdAt
            sourceApplication
            authorUser {
              id
              name
            }
          }
        }
      }
    }
  }
`;

export async function getModelWithVersions(projectId: string, modelId: string) {
  const data = await speckleGraphql<{
    project: {
      id: string;
      name: string;
      model: {
        id: string;
        name: string;
        versions: {
          totalCount: number;
          items: Array<{
            id: string;
            message: string | null;
            referencedObject: string;
            createdAt: string;
            sourceApplication: string | null;
            authorUser: { id: string; name: string } | null;
          }>;
        };
      } | null;
    } | null;
  }>(MODEL_VERSIONS_QUERY, { projectId, modelId });

  if (!data.project?.model) return null;

  const versions: SpeckleVersion[] = data.project.model.versions.items.map((v) => ({
    id: v.id,
    message: v.message,
    referencedObject: v.referencedObject,
    createdAt: v.createdAt,
    sourceApplication: v.sourceApplication,
    authorName: v.authorUser?.name ?? null,
  }));

  return {
    projectName: data.project.name,
    modelId: data.project.model.id,
    modelName: data.project.model.name,
    versions,
  };
}

/**
 * Comment threads for a model/version. Speckle's comment schema (rich-text
 * document shape, thread field name) has changed across server versions —
 * verify this query against your own server's GraphQL playground
 * (`{server}/graphql`) before relying on it in production. This is written
 * defensively: callers should treat failures as "comments unavailable"
 * rather than a hard error.
 */
const COMMENT_THREADS_QUERY = /* GraphQL */ `
  query CommentThreads($projectId: String!, $resourceIdString: String!) {
    project(id: $projectId) {
      commentThreads(limit: 50, filter: { resourceIdString: $resourceIdString }) {
        totalCount
        items {
          id
          rawText
          archived
          createdAt
          author {
            id
            name
          }
        }
      }
    }
  }
`;

export type SpeckleCommentThread = {
  id: string;
  rawText: string;
  createdAt: string;
  authorName: string | null;
};

export async function getCommentThreads(
  projectId: string,
  resourceIdString: string,
): Promise<SpeckleCommentThread[] | null> {
  try {
    const data = await speckleGraphql<{
      project: {
        commentThreads: {
          items: Array<{
            id: string;
            rawText: string;
            archived: boolean;
            createdAt: string;
            author: { id: string; name: string } | null;
          }>;
        };
      } | null;
    }>(COMMENT_THREADS_QUERY, { projectId, resourceIdString });

    if (!data.project) return null;

    return data.project.commentThreads.items
      .filter((c) => !c.archived)
      .map((c) => ({
        id: c.id,
        rawText: c.rawText,
        createdAt: c.createdAt,
        authorName: c.author?.name ?? null,
      }));
  } catch {
    return null;
  }
}

const MY_PROJECTS_QUERY = /* GraphQL */ `
  query MyProjects {
    activeUser {
      projects(limit: 100) {
        totalCount
        items {
          id
          name
          description
          updatedAt
          models(limit: 1) {
            totalCount
          }
        }
      }
    }
  }
`;

/** Lists every project visible to the service account token (used for the admin view). */
export async function getMyProjects(): Promise<SpeckleProjectSummary[]> {
  const data = await speckleGraphql<{
    activeUser: {
      projects: {
        items: Array<{
          id: string;
          name: string;
          description: string | null;
          updatedAt: string;
          models: { totalCount: number };
        }>;
      };
    } | null;
  }>(MY_PROJECTS_QUERY);

  if (!data.activeUser) return [];

  return data.activeUser.projects.items.map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description,
    updatedAt: p.updatedAt,
    modelCount: p.models.totalCount,
  }));
}

export { SPECKLE_SERVER_URL };
