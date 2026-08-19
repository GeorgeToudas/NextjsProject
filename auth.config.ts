import type {NextAuthConfig} from 'next-auth';

export const authConfig={
    pages: {
        signIn: '/login',
    },
    callbacks:{
        authorized ({auth,request:{nextUrl}}){
            const inLoggedIN=!!auth?.user;
            const inOnDashboard=nextUrl.pathname.startsWith('/dashboard');
            if (inOnDashboard){
                if(inLoggedIN) return true;
                return false;
            }else if(inLoggedIN){
                return Response.redirect(new URL('/dashboard',nextUrl));
            }
            return true;
        },
    },
    providers:[],
}satisfies NextAuthConfig;