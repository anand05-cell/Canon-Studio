import { publicErrorMessage } from '../middleware/publicError.js';
import { Router, Request, Response } from 'express';
import { requireAuth } from './auth.js';
import { aiService } from '../services/aiService.js';
import { memoryTreeService } from '../services/memoryTree.js';
import { cyberpunkUniverse } from '../data/defaultStoryBible.js';

export const storyRouter = Router();
storyRouter.use(requireAuth);

/**
 * POST /api/generate-beat
 * Request body: { promptInstruction: string, activeNodeId?: string, tone?: string }
 */
storyRouter.post('/generate-beat', async (req: Request, res: Response) => {
  try {
    const { promptInstruction, activeNodeId, tone } = req.body;

    let activeState = cyberpunkUniverse.initialState;
    let sceneSummary = 'Sub-level 3 alley during an Ion Storm';

    if (activeNodeId) {
      const node = memoryTreeService.getNodeById(activeNodeId);
      if (node) {
        activeState = node.activeState;
        sceneSummary = node.summary;
      }
    }

    const systemInstruction = `You are an award-winning screenplay and interactive game narrative writer for ${cyberpunkUniverse.universeName}.
Write dramatic screenplay beats formatted with standard screenplay slugs (INT./EXT.), Action descriptions, and in-character Dialogue.
Adhere strictly to character physical states (Jack has an uncalibrated prosthetic left arm) and weather rules (Ion Storm disables wireless comms).`;

    const prompt = `SCENE CONTEXT:
${sceneSummary}

ACTIVE CHARACTER STATE:
- Jack Vance: ${activeState.characterStatus['Jack_Vance'] || 'Prosthetic left arm damaged'}
- Inventory: ${activeState.inventory.join(', ')}

WRITER'S PROMPT INSTRUCTION:
${promptInstruction || 'Jack confronts an Arasaka operative who tracked them to the noodle bar.'}
Tone: ${tone || 'Gritty, tense, cinematic'}

Generate a short, high-impact scene beat (approx 120-180 words) in standard screenplay format.`;

    let generatedScript = '';
    if (aiService.isConfigured()) {
      generatedScript = await aiService.generateText(prompt, systemInstruction);
    } else {
      generatedScript = `EXT. SUB-LEVEL 3 ALLEY - NIGHT

Rain hammers against the rusted zinc roof like scattershot. Lightning arcs across the upper skyway, followed by the deep, magnetic hum of an Ion Storm.

Commander Jack Vance leans against a grease-stained dumpster, cradling his limp prosthetic left arm against his ribcage. Across the wet asphalt stands an ARASAKA OPERATIVE in polished obsidian carbon fiber.

JACK
(voice low, raspy)
You're three minutes late. And you brought two extra spotters on the roof.

OPERATIVE
Hand over the Shard, Vance. Before your neural harness fries for good.

Jack unholsters his silenced 9mm Flechette with his right hand.

JACK
Come take it. If your cyber-optics can cut through the storm.`;
    }

    res.json({
      sceneScript: generatedScript,
      universe: cyberpunkUniverse.universeName,
      activeState
    });
  } catch (error: any) {
    console.error('[API /api/generate-beat Error]:', error);
    res.status(500).json({ error: publicErrorMessage(error, 'Failed to generate story beat') });
  }
});
