import { publicErrorMessage } from '../middleware/publicError.js';
import { Router, Request, Response } from 'express';
import { requireAuth } from './auth.js';
import { wizardService, WizardAnswers } from '../services/wizardService.js';

export const wizardRouter = Router();
wizardRouter.use(requireAuth);

/**
 * POST /api/wizard/next-question
 * Body: { step: number, answers: WizardAnswers }
 */
wizardRouter.post('/next-question', async (req: Request, res: Response) => {
  try {
    const { step, answers } = req.body;
    const stepNumber = parseInt(step || '4', 10);
    const result = await wizardService.generateNextQuestion(stepNumber, answers || {});
    res.json(result);
  } catch (error: any) {
    console.error('[API /api/wizard/next-question Error]:', error);
    res.status(500).json({
      error: 'Failed to generate contextual question',
      message: publicErrorMessage(error, 'The AI service encountered an issue. Please retry.'),
      canRetry: true
    });
  }
});

/**
 * POST /api/wizard/generate-story
 * Body: WizardAnswers
 */
wizardRouter.post('/generate-story', async (req: Request, res: Response) => {
  try {
    const answers: WizardAnswers = req.body;
    const result = await wizardService.generateFullStory(answers);
    res.json(result);
  } catch (error: any) {
    console.error('[API /api/wizard/generate-story Error]:', error);
    res.status(500).json({
      error: 'Story generation encountered an error',
      message: publicErrorMessage(error, 'Please check your inputs and retry.'),
      canRetry: true
    });
  }
});
