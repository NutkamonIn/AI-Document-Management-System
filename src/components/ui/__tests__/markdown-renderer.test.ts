import { describe, it, expect } from 'vitest';

describe('Markdown Renderer Regex Parser (Level 1 & 2 Test)', () => {
  it('should accurately isolate image markdown tags from surrounding text and brackets', () => {
    const text = '[Document Page 80: ![Image Figure 17](/api/documents/images/img_12345) ]';
    const linkParts = text.split(/(!\[[^\]]*\]\([^)]+\))/g);

    expect(linkParts.length).toBe(3);
    expect(linkParts[0]).toBe('[Document Page 80: ');
    expect(linkParts[1]).toBe('![Image Figure 17](/api/documents/images/img_12345)');
    expect(linkParts[2]).toBe(' ]');

    const imgMatch = linkParts[1].match(/^!\[(.*?)\]\((.*?)\)$/);
    expect(imgMatch).not.toBeNull();
    expect(imgMatch![1]).toBe('Image Figure 17');
    expect(imgMatch![2]).toBe('/api/documents/images/img_12345');
  });

  it('should distinguish standard markdown links from image markdown tags', () => {
    const text = 'Here is a [standard link](http://example.com) and an ![image](/api/img.png)';
    const imageParts = text.split(/(!\[[^\]]*\]\([^)]+\))/g);

    expect(imageParts.length).toBe(3);
    expect(imageParts[1]).toBe('![image](/api/img.png)');
  });
});
