'use server';
import { z } from 'zod';
import connection from './db';
import {revalidatePath} from 'next/cache';
import {redirect} from 'next/navigation';
import {signIn} from '@/auth';
import {AuthError} from 'next-auth';

const FormSchema = z.object({
    id:z.string(),
    customerId:z.string({
        invalid_type_error:'Please select a customer.',
    }),
    amount:z.coerce.number().gt(0, {message:'Please enter an amount greater than $0.'}),
    status:z.string({
        invalid_type_error:'Please select an invoice status.',
    }),//z.enum(['pending', 'paid']),
    date:z.string()
    }
);

const CreateInvoice = FormSchema.omit({id:true, date:true});
const UpdateInvoice = FormSchema.omit({id:true, date:true});

export async function createInvoice(prevState:State, formData: FormData) {
    // Check if formData is an instance of FormData
    
    // Debugging: Log the type and content of formData
    console.log("formData type=", typeof formData);
    console.log("formData instance of FormData:", formData instanceof FormData);

    console.log("before formData");
    console.log(formData);
    console.log("after formData");

    const validatedFields = CreateInvoice.safeParse({
        customerId: formData.get('customerId'),
        amount: formData.get('amount'),
        status: formData.get('status'),
      });

      if (!validatedFields.success) {
        return {
            errors:validatedFields.error.flatten().fieldErrors,
            message:'Missing Fields. Failed to Create Invoice.'
        };
    }

    const {customerId, amount, status } = validatedFields.data;
    // Extract values from formData
    
    const amountInCents = Number(amount) * 100; // Ensure amount is treated as a number
    const date = new Date().toISOString().split('T')[0];

    const insert_sql = `INSERT INTO invoices(customer_id, amount, status, date) VALUES('${customerId}', ${amountInCents}, '${status}', '${date}')`;
    
    try {
        await connection.execute(insert_sql);
    } catch (error) {
        console.log(error);
        return {
            message: 'Database Error: Failed to Create Invoice.',
        };
    }

    revalidatePath('/dashboard/invoices');
    redirect('/dashboard/invoices');
}

export async function updateInvoice(id:string, prevState:State, formData:FormData){

    console.log("updateInvoice before");
    console.log(formData);
    console.log("updateInvoice after");

    const validatedFields = UpdateInvoice.safeParse(
        {
            customerId: formData.get('customerId'),
            amount: formData.get('amount'),
            status: formData.get('status'),
        }
    );

    if ( !validatedFields.success ) {
        return {
            errors:validatedFields.error.flatten().fieldErrors,
            message:'Some invalid fields. Failed to Update Invoice.'
        };
    }

    const {customerId, amount, status } = validatedFields.data;
    //const customerId = formData.get('customerId');
    //const amount = formData.get('amount');
    //const status = formData.get('status');

    const amountInCents = amount * 100;
    const update_sql = "UPDATE invoices SET customer_id='" + customerId + "', amount=" + amountInCents.toString() + ", status='" + status + "'" + " WHERE id=" +id;
    console.log(update_sql);
    try {
        await connection.execute(update_sql);
    } catch(error){
        console.log(error);
        return {message:'Database Error: Failed to Update Invoice.'};
    }
    
    revalidatePath('/dashboard/invoices');
    redirect('/dashboard/invoices');
}

export async function deleteInvoice(id:string){

    const delete_sql = "DELETE from invoices where id='" + id + "'";
    try {
        await connection.execute(delete_sql);
        revalidatePath('/dashboard/invoices');
        return {message:'Delete Invoice.'};
    } catch(error){
        console.log(error);
        return {message:'Database Error: Failed to Delete Invoice.'}
    }
}

export type State = {
    errors?:{
        customerId?:string[];
        amount?:string[];
        status?:string[];
    };
    message?:string | null;
};

export async function authenticate(
    prevState:string |undefined,
    formData:FormData,){
        try {
            await signIn('credentials', formData);
        } catch(error) {
            if ( error instanceof AuthError ) {
                switch (error.type) {
                    case 'CredentialsSignin':
                        return 'Invalid credentials';
                    default:
                        return 'Something went wrong.';
                }
            }            
            throw error;
        }
}