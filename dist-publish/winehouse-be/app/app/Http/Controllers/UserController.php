<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class UserController extends Controller
{
    public function index()
    {
        return User::orderByDesc('created_at')
            ->get(['id', 'name', 'email', 'created_at']);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name'     => ['required', 'string', 'max:255'],
            'email'    => ['required', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'string', 'min:10', 'confirmed'],
        ]);

        $user = User::create($data);

        return response()->json($user->only('id', 'name', 'email', 'created_at'), 201);
    }

    public function show(User $user)
    {
        return $user->only('id', 'name', 'email', 'created_at');
    }

    public function update(Request $request, User $user)
    {
        $data = $request->validate([
            'name'     => ['required', 'string', 'max:255'],
            'email'    => ['required', 'email', 'max:255', Rule::unique('users', 'email')->ignore($user->id)],
            'password' => ['nullable', 'string', 'min:10', 'confirmed'],
        ]);

        // Only update password when explicitly provided.
        if (empty($data['password'])) {
            unset($data['password']);
        }

        $user->update($data);

        return response()->json($user->fresh()->only('id', 'name', 'email', 'created_at'));
    }

    public function destroy(Request $request, User $user)
    {
        if ($request->user()->id === $user->id) {
            return response()->json(['message' => 'You cannot delete your own account.'], 403);
        }

        // Revoke the target user's tokens so they're signed out immediately.
        $user->tokens()->delete();
        $user->delete();

        return response()->json(['ok' => true]);
    }
}
