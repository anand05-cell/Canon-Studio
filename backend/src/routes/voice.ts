import { publicErrorMessage } from '../middleware/publicError.js';
import { Router, Request, Response } from 'express';
import { requireAuth } from './auth.js';
import { voiceAnalyzer } from '../services/voiceAnalyzer.js';

export const voiceRouter = Router();
voiceRouter.use(requireAuth);

/**
 * POST /api/analyze-voice
 * Request body: { characterName: string, dialogueLine: string }
 */
voiceRouter.post('/', async (req: Request, res: Response) => {
  try {
    const { characterName, dialogueLine } = req.body;

    if (!characterName || !dialogueLine) {
      res.status(400).json({ error: 'characterName and dialogueLine are both required.' });
      return;
    }

    const result = await voiceAnalyzer.analyzeDialogue(characterName, dialogueLine);
    res.json(result);
  } catch (error: any) {
    console.error('[API /api/analyze-voice Error]:', error);
    res.status(500).json({ error: publicErrorMessage(error, 'Failed to analyze dialogue voice') });
  }
});
