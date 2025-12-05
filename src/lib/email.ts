/**
 * ============================================
 * EMAIL CONFIGURATION / ИМЕЙЛ КОНФИГУРАЦИЯ
 * ============================================
 * 
 * Използва Supabase Edge Function + Brevo API
 * 
 * Лимит: 300 имейла/ден с Brevo безплатен план
 */

import { supabase } from './supabase'

// Получатели
export const PRIMARY_RECIPIENTS = [
  'foods_op@aladin.bg',
]

export const CC_RECIPIENTS = [
  'matey.georgiev@aladin.bg',
]

// Получател за Pepsi (изпълнител)
export const PEPSI_RECIPIENT = 'Yordanka.Ivanova@pepsiint.bg'

// Email subject templates
export const EMAIL_SUBJECT_TEMPLATE = (restaurantName: string, deliveryDate: string) => 
  `Заявка за напитки - ${restaurantName} - Доставка: ${deliveryDate}`

export const PEPSI_NOTIFICATION_SUBJECT = (restaurantName: string, deliveryDate: string) =>
  `[Aladin Foods] Нова заявка - ${restaurantName} - ${deliveryDate}`

/**
 * Изпращане на имейл чрез Supabase Edge Function + Brevo
 */
export const sendOrderEmail = async (
  to: string[],
  cc: string[],
  subject: string,
  htmlContent: string
): Promise<{ success: boolean; error?: string }> => {
  
  try {
    const { data, error } = await supabase.functions.invoke('send-email', {
      body: {
        to,
        cc,
        subject,
        html: htmlContent,
      },
    })

    if (error) {
      console.error('❌ Edge Function error:', error)
      return { success: false, error: error.message }
    }

    console.log('✅ Email sent successfully:', data)
    return { success: true }

  } catch (error) {
    console.error('❌ Email error:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Грешка при изпращане на имейл' 
    }
  }
}

/**
 * Генерира HTML съдържание за имейл с поръчка
 */
export const generateOrderEmailHtml = (order: {
  restaurantName: string;
  deliveryDate: string;
  items: Array<{
    product_code: string;
    product_name: string;
    quantity: number;
    price_per_stack: number;
    total_price: number;
  }>;
  totalAmount: number;
  createdBy: string;
  notes?: string;
}): string => {
  const itemsHtml = order.items
    .map(item => `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; font-family: monospace;">${item.product_code}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${item.product_name}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center; font-weight: 600;">${item.quantity}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">${item.price_per_stack.toFixed(2)} лв.</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: 600; color: #195E33;">${item.total_price.toFixed(2)} лв.</td>
      </tr>
    `)
    .join('')

  return `
    <div style="max-width: 650px; margin: 0 auto; font-family: Arial, sans-serif;">
      <div style="background: linear-gradient(135deg, #195E33 0%, #238442 100%); padding: 30px; border-radius: 12px 12px 0 0;">
        <h1 style="margin: 0; color: white; font-size: 24px;">Нова заявка за напитки</h1>
        <p style="margin: 8px 0 0 0; color: rgba(255,255,255,0.85);">Aladin Foods</p>
      </div>
      
      <div style="background: white; padding: 30px; border: 1px solid #e5e7eb;">
        <div style="background: #f8faf9; border-radius: 8px; padding: 20px; margin-bottom: 25px;">
          <p style="margin: 8px 0;"><strong>Ресторант:</strong> ${order.restaurantName}</p>
          <p style="margin: 8px 0;"><strong>Дата на доставка:</strong> ${order.deliveryDate}</p>
          <p style="margin: 8px 0;"><strong>Създадена от:</strong> ${order.createdBy}</p>
          <p style="margin: 8px 0;"><strong>Дата на заявка:</strong> ${new Date().toLocaleString('bg-BG')}</p>
          ${order.notes ? `<p style="margin: 8px 0;"><strong>Забележки:</strong> ${order.notes}</p>` : ''}
        </div>
        
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="background: #195E33;">
              <th style="padding: 12px; text-align: left; color: white;">Код</th>
              <th style="padding: 12px; text-align: left; color: white;">Артикул</th>
              <th style="padding: 12px; text-align: center; color: white;">К-во</th>
              <th style="padding: 12px; text-align: right; color: white;">Цена</th>
              <th style="padding: 12px; text-align: right; color: white;">Общо</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>
        
        <div style="margin-top: 20px; padding: 20px; background: #195E33; border-radius: 8px; text-align: right;">
          <span style="color: white;">ОБЩО С ДДС: </span>
          <span style="color: white; font-size: 24px; font-weight: bold;">${order.totalAmount.toFixed(2)} лв.</span>
        </div>
      </div>
      
      <div style="padding: 20px; text-align: center; color: #888; font-size: 12px;">
        © ${new Date().getFullYear()} Aladin Foods - Автоматичен имейл
      </div>
    </div>
  `
}

/**
 * Генерира HTML за Pepsi нотификация (БЕЗ ЦЕНИ)
 */
export const generatePepsiNotificationHtml = (order: {
  restaurantName: string;
  deliveryDate: string;
  items: Array<{
    product_code: string;
    product_name: string;
    quantity: number;
  }>;
  createdBy: string;
  notes?: string;
}): string => {
  const itemsHtml = order.items
    .map(item => `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${item.product_code}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${item.product_name}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center; font-weight: 600;">${item.quantity}</td>
      </tr>
    `)
    .join('')

  return `
    <div style="max-width: 650px; margin: 0 auto; font-family: Arial, sans-serif;">
      <div style="background: linear-gradient(135deg, #004B93 0%, #0066CC 100%); padding: 30px; border-radius: 12px 12px 0 0;">
        <h1 style="margin: 0; color: white; font-size: 24px;">Нова заявка за изпълнение</h1>
        <p style="margin: 8px 0 0 0; color: rgba(255,255,255,0.85);">От Aladin Foods</p>
      </div>
      
      <div style="background: white; padding: 30px; border: 1px solid #e5e7eb;">
        <div style="background: #f0f7ff; border-radius: 8px; padding: 20px; margin-bottom: 25px;">
          <p style="margin: 8px 0;"><strong>Ресторант:</strong> ${order.restaurantName}</p>
          <p style="margin: 8px 0;"><strong>Дата на доставка:</strong> ${order.deliveryDate}</p>
          <p style="margin: 8px 0;"><strong>Създадена от:</strong> ${order.createdBy}</p>
          <p style="margin: 8px 0;"><strong>Дата на заявка:</strong> ${new Date().toLocaleString('bg-BG')}</p>
          ${order.notes ? `<p style="margin: 8px 0;"><strong>Забележки:</strong> ${order.notes}</p>` : ''}
        </div>
        
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="background: #004B93;">
              <th style="padding: 12px; text-align: left; color: white;">Код</th>
              <th style="padding: 12px; text-align: left; color: white;">Артикул</th>
              <th style="padding: 12px; text-align: center; color: white;">Количество</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>
      </div>
      
      <div style="padding: 20px; text-align: center; color: #888; font-size: 12px;">
        © ${new Date().getFullYear()} Aladin Foods - Автоматичен имейл
      </div>
    </div>
  `
}

/**
 * Изпраща нотификация до Pepsi
 */
export const sendPepsiNotification = async (order: {
  restaurantName: string;
  deliveryDate: string;
  items: Array<{
    product_code: string;
    product_name: string;
    quantity: number;
  }>;
  createdBy: string;
  notes?: string;
}): Promise<{ success: boolean; error?: string }> => {
  const subject = PEPSI_NOTIFICATION_SUBJECT(order.restaurantName, order.deliveryDate)
  const html = generatePepsiNotificationHtml(order)
  
  return sendOrderEmail([PEPSI_RECIPIENT], [], subject, html)
}