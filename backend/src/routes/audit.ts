import { publicErrorMessage } from '../middleware/publicError.js';
import { Router, Request, Response } from 'express';
import { requireAuth } from './auth.js';
import { loreAuditor } from '../services/loreAuditor.js';
import { memoryTreeService } from '../services/memoryTree.js';
import { cyberpunkUniverse } from '../data/defaultStoryBible.js';

export const auditRouter = Router();
auditRouter.use(requireAuth);

/**
 * POST /api/audit-lore
 * Request body: { scriptText: string, activeNodeId?: string }
 */
auditRouter.post('/', async (req: Request, res: Response) => {
  try {
    const { scriptText, activeNodeId } = req.body;

    if (!scriptText || typeof scriptText !== 'string') {
      res.status(400).json({ error: 'scriptText string is required in request body.' });
      return;
    }

    let activeState = cyberpunkUniverse.initialState;
    if (activeNodeId) {
      const node = memoryTreeService.getNodeById(activeNodeId);
      if (node) {
        activeState = node.activeState;
      }
    }

    const auditResult = await loreAuditor.auditScene(scriptText, cyberpunkUniverse, activeState);
    res.json(auditResult);
  } catch (error: any) {
    console.error('[API /api/audit-lore Error]:', error);
    res.status(500).json({ error: publicErrorMessage(error, 'Failed to execute lore audit') });
  }
});
