import { publicErrorMessage } from '../middleware/publicError.js';
import { Router, Request, Response } from 'express';
import { branchingService, BranchingSetup, NextSceneRequest } from '../services/branchingService.js';
import { exportService, BranchJourneyExportInput } from '../services/exportService.js';
import { imageService } from '../services/imageService.js';
import { requireAuth } from './auth.js';

export const branchingRouter = Router();

/**
 * POST /api/branching/start
 * Body: BranchingSetup
 */
branchingRouter.post('/start', requireAuth, async (req: Request, res: Response) => {
  try {
    const setup: BranchingSetup = req.body;
    const scene = await branchingService.startStory(setup);
    res.json(scene);
  } catch (error: any) {
    console.error('[API /api/branching/start Error]:', error);
    res.status(500).json({
      error: 'Failed to start branching story',
      message: publicErrorMessage(error, 'Please try again.'),
      canRetry: true
    });
  }
});

/**
 * POST /api/branching/next
 * Body: NextSceneRequest
 */
branchingRouter.post('/next', requireAuth, async (req: Request, res: Response) => {
  try {
    const requestData: NextSceneRequest = req.body;
    const scene = await branchingService.nextScene(requestData);
    res.json(scene);
  } catch (error: any) {
    console.error('[API /api/branching/next Error]:', error);
    res.status(500).json({
      error: 'Failed to generate next branch scene',
      message: publicErrorMessage(error, 'Please try again.'),
      canRetry: true
    });
  }
});

/**
 * POST /api/branching/export-journey
 * Body: BranchJourneyExportInput
 */
branchingRouter.post('/export-journey', (req: Request, res: Response) => {
  try {
    const input: BranchJourneyExportInput = req.body;
    const exported = exportService.exportBranchingJourney(input);

    if (req.query.download === 'true') {
      res.setHeader('Content-Disposition', `attachment; filename="${exported.filename}"`);
      res.setHeader('Content-Type', exported.mimeType);
      res.send(exported.content);
      return;
    }

    res.json(exported);
  } catch (error: any) {
    console.error('[API /api/branching/export-journey Error]:', error);
    res.status(500).json({
      error: 'Failed to export branching journey',
      message: publicErrorMessage(error, 'Export error')
    });
  }
});

/**
 * POST /api/branching/illustrate-scene
 * Body: { sceneText: string, title?: string, genre?: string }
 */
branchingRouter.post('/illustrate-scene', requireAuth, async (req: Request, res: Response) => {
  try {
    const { sceneText, title, genre } = req.body;
    if (!sceneText) {
      res.status(400).json({ error: 'sceneText is required' });
      return;
    }
    const art = await imageService.generateSceneArt(sceneText, title, genre);
    res.json(art);
  } catch (error: any) {
    console.error('[API /api/branching/illustrate-scene Error]:', error);
    res.status(500).json({ error: publicErrorMessage(error, 'Failed to illustrate scene') });
  }
});

