import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';

export const { handlers, signIn, signOut, auth } = NextAuth({
	providers: [
		Credentials({
			name: 'Credentials',
			credentials: {
				email: { label: 'Email', type: 'email' },
				password: { label: 'Password', type: 'password' },
			},
		async authorize(credentials){
			if (!credentials?.email || !credentials?.password) {
				return null;
			}
			const email = credentials.email as string;
			const password = credentials.password as string;

			const user = await prisma.user.findUnique({
				where: { email },
			});
			
			if (!user || !user.password) {
				return null;
			}
			const isPasswordValid = await bcrypt.compare(password, user.password);
			if (!isPasswordValid){
				return null;
			}
			
			return {
				id: user.id,
				email: user.email,
				name: user.name,
				role: user.role,
			};
		},
	}),
],
callbacks: {
	//Callback1 : jwt() - create or update Token
	//GET id and role user -> JWT Token
	async jwt({ token, user }) {
		if (user) {
			token.id = user.id;
			token.role = (user as any).role;
		}
		return token;
	},
	//Callback2 : session() 
	//attach id and role form JWT Token -> session.user to use in UI
	async session({ session, token }) {
		if (session.user) {
			session.user.id = token.id as string
			(session.user as any).role = token.role;
		}
		return session;
		},
	},
	//Set path UI if to open Login
	pages: {
		signIn: '/login',
	},
	// use Sesson strategy JWT 
	session : { strategy: 'jwt' },
});
