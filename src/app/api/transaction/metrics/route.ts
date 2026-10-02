import { NextResponse } from "next/server";

export const revalidate = 30;

const BACKEND_URL = process.env.BACKEND_URL;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const queryString = searchParams.toString();
    const metricsQuery = queryString ? `?${queryString}` : "";

    // Fetch backend metrics and dapps count concurrently
    const [metricsRes, dappsRes] = await Promise.all([
      fetch(`${BACKEND_URL}/api/transaction/metrics${metricsQuery}`, {
        next: { revalidate: 30 },
      }),
      fetch(`${BACKEND_URL}/api/transaction/dapps/count`, {
        next: { revalidate: 30 },
      }),
    ]);

    const metricsData = await metricsRes.json();
    const dappsData = await dappsRes.json();

    return NextResponse.json({
      ...metricsData,
      totalDapps: dappsData.totalDapps || 0,
      success: metricsData.success !== false && dappsData.success !== false,
    });
  } catch (error) {
    console.error("Error fetching aggregated metrics from backend:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch metrics" },
      { status: 500 }
    );
  }
}