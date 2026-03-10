import { getServerSession, Session } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";

/**
 * API認証チェックヘルパー
 * 認証が必要なAPIエンドポイントで使用
 *
 * @returns セッション情報（認証成功時）またはnull（認証失敗時）
 *
 * 使用例:
 * ```
 * const authResult = await requireAuth();
 * if (authResult.error) return authResult.error;
 * const session = authResult.session;
 * ```
 */
/**
 * 安全なparseInt - NaNの場合はnullを返す
 */
export function safeParseInt(value: string | null | undefined): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? null : parsed;
}

/**
 * 必須のparseInt - NaNの場合はエラーレスポンスを返す
 */
export function requireInt(
  value: string | null | undefined,
  fieldName: string
): { value: number; error: null } | { value: null; error: NextResponse } {
  const parsed = safeParseInt(value);
  if (parsed === null) {
    return {
      value: null,
      error: NextResponse.json(
        { error: `${fieldName}は有効な数値を入力してください` },
        { status: 400 }
      ),
    };
  }
  return { value: parsed, error: null };
}

export async function requireAuth(): Promise<
  | { session: Session; error: null }
  | { session: null; error: NextResponse }
> {
  const session = await getServerSession(authOptions);

  if (!session) {
    return {
      session: null,
      error: NextResponse.json(
        { error: "認証が必要です" },
        { status: 401 }
      ),
    };
  }

  return { session, error: null };
}
