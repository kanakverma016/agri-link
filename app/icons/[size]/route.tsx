import { ImageResponse } from 'next/og'
import { readFile } from 'node:fs/promises'
import path from 'node:path'

export const dynamic = 'force-static'

export function generateStaticParams() {
  return [{ size: '180' }, { size: '192' }, { size: '512' }, { size: 'maskable' }]
}

export async function GET(_req: Request, { params }: { params: Promise<{ size: string }> }) {
  const { size } = await params
  const maskable = size === 'maskable'
  const px = maskable ? 512 : Number(size) || 512

  const file = await readFile(path.join(process.cwd(), 'public/images/icon-source.png'))
  const src = `data:image/png;base64,${file.toString('base64')}`
  const inner = maskable ? Math.round(px * 0.8) : px

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: maskable ? '#047857' : 'transparent',
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} width={inner} height={inner} alt="" />
      </div>
    ),
    { width: px, height: px },
  )
}
