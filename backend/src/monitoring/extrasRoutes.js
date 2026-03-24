import {
  fetchOpenPortsEnriched,
  fetchSSHSessions,
  fetchStorageByUser
} from './monitoringService.js';
import { metricsCache } from './scheduler.js';

export async function extrasRoutes(fastify) {
  fastify.addHook('onRequest', fastify.authenticate);

  /**
   * GET /api/extras/ports
   * Open listening ports on both nodes with process + user info
   */
  fastify.get('/ports', async (request, reply) => {
    const [n1, n2] = await Promise.allSettled([
      fetchOpenPortsEnriched('node1'),
      fetchOpenPortsEnriched('node2')
    ]);
    return {
      node1: n1.status === 'fulfilled' ? n1.value : { ports: [], error: n1.reason?.message },
      node2: n2.status === 'fulfilled' ? n2.value : { ports: [], error: n2.reason?.message },
      timestamp: new Date().toISOString()
    };
  });

  /**
   * GET /api/extras/ports/:nodeId
   */
  fastify.get('/ports/:nodeId', async (request, reply) => {
    const { nodeId } = request.params;
    return fetchOpenPortsEnriched(nodeId);
  });

  /**
   * GET /api/extras/ssh-sessions
   * Active SSH sessions + recent login history on both nodes
   */
  fastify.get('/ssh-sessions', async (request, reply) => {
    const [n1, n2] = await Promise.allSettled([
      fetchSSHSessions('node1'),
      fetchSSHSessions('node2')
    ]);
    return {
      node1: n1.status === 'fulfilled' ? n1.value : { sessions: [], error: n1.reason?.message },
      node2: n2.status === 'fulfilled' ? n2.value : { sessions: [], error: n2.reason?.message },
      timestamp: new Date().toISOString()
    };
  });

  /**
   * GET /api/extras/storage-by-user
   * Per-user disk usage across both nodes
   */
  fastify.get('/storage-by-user', async (request, reply) => {
    const [n1, n2] = await Promise.allSettled([
      fetchStorageByUser('node1'),
      fetchStorageByUser('node2')
    ]);
    return {
      node1: n1.status === 'fulfilled' ? n1.value : { users: [], error: n1.reason?.message },
      node2: n2.status === 'fulfilled' ? n2.value : { users: [], error: n2.reason?.message },
      timestamp: new Date().toISOString()
    };
  });
}