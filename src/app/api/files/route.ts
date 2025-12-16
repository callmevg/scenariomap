import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

// Directory for storing graph files - use absolute path
const DATA_DIR = path.resolve(process.cwd(), 'data', 'graphs');

// Ensure the directory exists
async function ensureDataDir() {
    try {
        await fs.access(DATA_DIR);
    } catch {
        await fs.mkdir(DATA_DIR, { recursive: true });
    }
}

// GET - List all saved files or read a specific file
export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const filename = searchParams.get('filename');

    try {
        await ensureDataDir();

        if (filename) {
            // Read specific file
            const filePath = path.join(DATA_DIR, filename);
            
            // Security: ensure the path is within DATA_DIR
            if (!filePath.startsWith(DATA_DIR)) {
                return NextResponse.json({ error: 'Invalid file path' }, { status: 400 });
            }

            try {
                const content = await fs.readFile(filePath, 'utf-8');
                const data = JSON.parse(content);
                return NextResponse.json({ data, filename });
            } catch {
                return NextResponse.json({ error: 'File not found' }, { status: 404 });
            }
        } else {
            // List all files
            const files = await fs.readdir(DATA_DIR);
            const jsonFiles = files.filter(f => f.endsWith('.json'));
            
            // Get file stats for each file
            const fileStats = await Promise.all(
                jsonFiles.map(async (filename) => {
                    const filePath = path.join(DATA_DIR, filename);
                    const stats = await fs.stat(filePath);
                    return {
                        filename,
                        name: filename.replace('.json', ''),
                        modifiedAt: stats.mtime.toISOString(),
                        size: stats.size,
                    };
                })
            );

            return NextResponse.json({ files: fileStats });
        }
    } catch (error: any) {
        console.error('File API error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// POST - Save a new file
export async function POST(request: NextRequest) {
    try {
        await ensureDataDir();

        const body = await request.json();
        const { filename, data } = body;

        if (!filename || !data) {
            return NextResponse.json({ error: 'Filename and data are required' }, { status: 400 });
        }

        // Sanitize filename
        const sanitizedFilename = filename.replace(/[^a-zA-Z0-9_-]/g, '_') + '.json';
        const filePath = path.join(DATA_DIR, sanitizedFilename);

        // Security: ensure the path is within DATA_DIR
        if (!filePath.startsWith(DATA_DIR)) {
            return NextResponse.json({ error: 'Invalid file path' }, { status: 400 });
        }

        await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');

        return NextResponse.json({ 
            success: true, 
            filename: sanitizedFilename,
            message: `File saved as ${sanitizedFilename}` 
        });
    } catch (error: any) {
        console.error('File save error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// DELETE - Delete a file
export async function DELETE(request: NextRequest) {
    try {
        await ensureDataDir();

        const { searchParams } = new URL(request.url);
        const filename = searchParams.get('filename');

        if (!filename) {
            return NextResponse.json({ error: 'Filename is required' }, { status: 400 });
        }

        const filePath = path.join(DATA_DIR, filename);

        // Security: ensure the path is within DATA_DIR
        if (!filePath.startsWith(DATA_DIR)) {
            return NextResponse.json({ error: 'Invalid file path' }, { status: 400 });
        }

        try {
            await fs.unlink(filePath);
            return NextResponse.json({ success: true, message: `File ${filename} deleted` });
        } catch {
            return NextResponse.json({ error: 'File not found' }, { status: 404 });
        }
    } catch (error: any) {
        console.error('File delete error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
