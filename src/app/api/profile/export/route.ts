import { NextResponse } from 'next/server';
import { requireAuthUser } from '@/lib/auth';
import { apiError } from '@/lib/api-response';
import { DataPrivacyService } from '@/services/data-privacy.service';

export async function GET() {
  try {
    const user = await requireAuthUser();
    const exportData = await DataPrivacyService.exportUserData(user.id);

    const jsonString = JSON.stringify(exportData, null, 2);
    const filename = `fretflow-data-export-${new Date().toISOString().slice(0, 10)}.json`;

    return new NextResponse(jsonString, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });
  } catch (error) {
    return apiError(error);
  }
}
