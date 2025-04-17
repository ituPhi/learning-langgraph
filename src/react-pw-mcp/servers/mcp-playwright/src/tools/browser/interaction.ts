import { BrowserToolBase } from './base.js';
import { ToolContext, ToolResponse, createSuccessResponse, createErrorResponse } from '../common/types.js';

/**
 * Tool for clicking elements on the page
 */
export class ClickTool extends BrowserToolBase {
  /**
   * Execute the click tool
   */
  async execute(args: any, context: ToolContext): Promise<ToolResponse> {
    return this.safeExecute(context, async (page) => {
      await page.click(args.selector);
      return createSuccessResponse(`Clicked element: ${args.selector}`);
    });
  }
}

/**
 * Tool for clicking elements inside iframes
 */
export class IframeClickTool extends BrowserToolBase {
  /**
   * Execute the iframe click tool
   */
  async execute(args: any, context: ToolContext): Promise<ToolResponse> {
    return this.safeExecute(context, async (page) => {
      const frame = page.frameLocator(args.iframeSelector);
      if (!frame) {
        return createErrorResponse(`Iframe not found: ${args.iframeSelector}`);
      }
      
      await frame.locator(args.selector).click();
      return createSuccessResponse(`Clicked element ${args.selector} inside iframe ${args.iframeSelector}`);
    });
  }
}

/**
 * Tool for filling form fields
 */
export class FillTool extends BrowserToolBase {
  /**
   * Execute the fill tool
   */
  async execute(args: any, context: ToolContext): Promise<ToolResponse> {
    return this.safeExecute(context, async (page) => {
      await page.waitForSelector(args.selector);
      await page.fill(args.selector, args.value);
      return createSuccessResponse(`Filled ${args.selector} with: ${args.value}`);
    });
  }
}

/**
 * Tool for selecting options from dropdown menus
 */
export class SelectTool extends BrowserToolBase {
  /**
   * Execute the select tool
   */
  async execute(args: any, context: ToolContext): Promise<ToolResponse> {
    return this.safeExecute(context, async (page) => {
      await page.waitForSelector(args.selector);
      await page.selectOption(args.selector, args.value);
      return createSuccessResponse(`Selected ${args.selector} with: ${args.value}`);
    });
  }
}

/**
 * Tool for hovering over elements
 */
export class HoverTool extends BrowserToolBase {
  /**
   * Execute the hover tool
   */
  async execute(args: any, context: ToolContext): Promise<ToolResponse> {
    return this.safeExecute(context, async (page) => {
      await page.waitForSelector(args.selector);
      await page.hover(args.selector);
      return createSuccessResponse(`Hovered ${args.selector}`);
    });
  }
}

/**
 * Tool for executing JavaScript in the browser
 */
export class EvaluateTool extends BrowserToolBase {
  /**
   * Execute the evaluate tool
   */
  async execute(args: any, context: ToolContext): Promise<ToolResponse> {
    return this.safeExecute(context, async (page) => {
      const result = await page.evaluate(args.script);
      
      // Convert result to string for display
      let resultStr: string;
      try {
        resultStr = JSON.stringify(result, null, 2);
      } catch (error) {
        resultStr = String(result);
      }
      
      return createSuccessResponse([
        `Executed JavaScript:`,
        `${args.script}`,
        `Result:`,
        `${resultStr}`
      ]);
    });
  }
}

/**
 * Tool for dragging elements on the page
 */
export class DragTool extends BrowserToolBase {
  /**
   * Execute the drag tool
   */
  async execute(args: any, context: ToolContext): Promise<ToolResponse> {
    return this.safeExecute(context, async (page) => {
      const sourceElement = await page.waitForSelector(args.sourceSelector);
      const targetElement = await page.waitForSelector(args.targetSelector);
      
      const sourceBound = await sourceElement.boundingBox();
      const targetBound = await targetElement.boundingBox();
      
      if (!sourceBound || !targetBound) {
        return createErrorResponse("Could not get element positions for drag operation");
      }

      await page.mouse.move(
        sourceBound.x + sourceBound.width / 2,
        sourceBound.y + sourceBound.height / 2
      );
      await page.mouse.down();
      await page.mouse.move(
        targetBound.x + targetBound.width / 2,
        targetBound.y + targetBound.height / 2
      );
      await page.mouse.up();
      
      return createSuccessResponse(`Dragged element from ${args.sourceSelector} to ${args.targetSelector}`);
    });
  }
}

/**
 * Tool for pressing keyboard keys
 */
export class PressKeyTool extends BrowserToolBase {
  /**
   * Execute the key press tool
   */
  async execute(args: any, context: ToolContext): Promise<ToolResponse> {
    return this.safeExecute(context, async (page) => {
      if (args.selector) {
        await page.waitForSelector(args.selector);
        await page.focus(args.selector);
      }
      
      await page.keyboard.press(args.key);
      return createSuccessResponse(`Pressed key: ${args.key}`);
    });
  }
} 