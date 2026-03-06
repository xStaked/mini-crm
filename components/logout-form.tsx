export function LogoutForm() {
  return (
    <form action="/api/auth/logout" method="post">
      <button
        type="submit"
        className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
      >
        Logout
      </button>
    </form>
  );
}
