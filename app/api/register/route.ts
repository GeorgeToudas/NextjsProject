import {NextRequest, NextResponse} from "next/server";
import {z} from "zod";
import bcrypt from "bcrypt";
import {getDataSource} from "@/app/lib/data-source";
import{User} from "@/app/lib/entities/user.entity";

const registerSchema = z.object({
  name: z.string().min(1,'Name is required'),
  email: z.string().email('Invalid email address'), 
  password: z.string().min(8,'Password must be at least 8 characters long'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const result = registerSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: result.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const { name, email, password } = result.data;

    const ds = await getDataSource();
    const userRepo = ds.getRepository(User);

    const existingUser = await userRepo.findOne({ where: { email } });
    if (existingUser) {
      return NextResponse.json(
        { error: 'A user with this email already exists' },
        { status: 409 },
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = userRepo.create({
      name,
      email,
      password: hashedPassword,
    });
    const savedUser = await userRepo.save(newUser);

    return NextResponse.json(
      {
        id: savedUser.id,
        name: savedUser.name,
        email: savedUser.email,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}