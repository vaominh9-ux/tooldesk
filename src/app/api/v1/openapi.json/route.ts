import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const host = request.headers.get('host') || 'tooldesk-plum.vercel.app';
  const protocol = host.includes('localhost') ? 'http' : 'https';
  const baseUrl = `${protocol}://${host}`;

  const spec = {
    openapi: '3.0.3',
    info: {
      title: 'Tooldesk AI Agent API',
      version: '1.0.0',
      description: 'API kết nối hai chiều dành cho AI Agents (ChatGPT, Claude, Smax, n8n, Zalo/Telegram Bot) đọc và ghi dữ liệu quản lý bán tool AI.'
    },
    servers: [
      {
        url: `${baseUrl}/api/v1`,
        description: 'Máy chủ hiện tại'
      }
    ],
    components: {
      securitySchemes: {
        ApiKeyAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'x-api-key',
          description: 'Khóa API Key bí mật của Tooldesk'
        },
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'API_KEY'
        }
      }
    },
    security: [
      { ApiKeyAuth: [] },
      { BearerAuth: [] }
    ],
    paths: {
      '/health': {
        get: {
          summary: 'Kiểm tra trạng thái hệ thống',
          description: 'Xem trạng thái hoạt động, ngày vận hành và danh sách các endpoint.',
          operationId: 'getHealth',
          security: [],
          responses: {
            '200': { description: 'Hệ thống hoạt động bình thường.' }
          }
        }
      },
      '/products': {
        get: {
          summary: 'Xem danh mục sản phẩm và bảng giá',
          description: 'Lấy danh sách các tool AI (ChatGPT, Claude, Gemini, Canva...) và các gói bán kèm giá tiền VND.',
          operationId: 'getProducts',
          parameters: [
            {
              name: 'category',
              in: 'query',
              required: false,
              schema: { type: 'string' },
              description: 'Lọc theo danh mục (Trợ lý AI, Thiết kế, Nghiên cứu)'
            }
          ],
          responses: {
            '200': { description: 'Danh sách sản phẩm thành công.' }
          }
        }
      },
      '/customers': {
        get: {
          summary: 'Tra cứu khách hàng',
          description: 'Tìm kiếm khách hàng theo số điện thoại, email hoặc tên; xem các gói đang dùng.',
          operationId: 'searchCustomers',
          parameters: [
            {
              name: 'query',
              in: 'query',
              required: false,
              schema: { type: 'string' },
              description: 'Từ khóa tìm kiếm (SĐT, email, họ tên hoặc mã khách)'
            }
          ],
          responses: {
            '200': { description: 'Danh sách khách hàng phù hợp.' }
          }
        },
        post: {
          summary: 'Tạo khách hàng mới',
          description: 'Thêm hồ sơ khách hàng mới vào hệ thống.',
          operationId: 'createCustomer',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['name'],
                  properties: {
                    name: { type: 'string', description: 'Họ tên khách hàng' },
                    phone: { type: 'string', description: 'Số điện thoại liên hệ' },
                    email: { type: 'string', description: 'Địa chỉ email' },
                    source: { type: 'string', description: 'Nguồn khách (vd: Smax, Zalo, Messenger, Website)' },
                    notes: { type: 'string', description: 'Ghi chú thêm về khách' }
                  }
                }
              }
            }
          },
          responses: {
            '201': { description: 'Tạo khách hàng thành công.' }
          }
        }
      },
      '/subscriptions': {
        get: {
          summary: 'Tra cứu các gói dịch vụ',
          description: 'Lấy danh sách gói dịch vụ, lọc theo tình trạng còn hạn (active), sắp hết hạn (expiring) hoặc quá hạn (expired).',
          operationId: 'getSubscriptions',
          parameters: [
            {
              name: 'status',
              in: 'query',
              required: false,
              schema: { type: 'string', enum: ['active', 'expiring', 'expired', 'all'] },
              description: 'Lọc theo trạng thái gói'
            },
            {
              name: 'customerId',
              in: 'query',
              required: false,
              schema: { type: 'string' },
              description: 'Lọc theo mã khách hàng cụ thể'
            }
          ],
          responses: {
            '200': { description: 'Danh sách gói dịch vụ.' }
          }
        }
      },
      '/orders': {
        get: {
          summary: 'Lấy lịch sử đơn hàng',
          description: 'Xem các đơn hàng đã tạo, trạng thái thanh toán và doanh thu.',
          operationId: 'getOrders',
          parameters: [
            {
              name: 'customerId',
              in: 'query',
              required: false,
              schema: { type: 'string' }
            },
            {
              name: 'payment',
              in: 'query',
              required: false,
              schema: { type: 'string', enum: ['paid', 'unpaid'] }
            }
          ],
          responses: {
            '200': { description: 'Danh sách đơn hàng.' }
          }
        },
        post: {
          summary: 'Tạo đơn hàng mới và cấp gói dịch vụ',
          description: 'AI Agent tạo đơn mua tool cho khách. Tự động tính hạn sử dụng và cấp gói dịch vụ.',
          operationId: 'createOrder',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['productId', 'planId'],
                  properties: {
                    customerId: { type: 'string', description: 'Mã khách hàng có sẵn (vd: kh-001)' },
                    customer: {
                      type: 'object',
                      description: 'Hoặc thông tin khách mới nếu chưa có mã',
                      properties: {
                        name: { type: 'string' },
                        phone: { type: 'string' },
                        email: { type: 'string' }
                      }
                    },
                    productId: { type: 'string', description: 'Mã sản phẩm (vd: p-claude, p-chatgpt, p-gemini)' },
                    planId: { type: 'string', description: 'Mã gói (vd: pl-claude-1, pl-gpt-1)' },
                    payment: { type: 'string', enum: ['paid', 'unpaid'], default: 'paid', description: 'Đã thanh toán hay chờ thu' },
                    date: { type: 'string', format: 'date', description: 'Ngày bán thực tế; để trống dùng ngày vận hành. Đơn cũ cần truyền ngày đã bán.' },
                    paidAt: { type: 'string', format: 'date', description: 'Ngày nhận tiền thực tế cho đơn đã thu; doanh thu tính theo tháng này. Để trống dùng ngày bán.' },
                    note: { type: 'string', description: 'Ghi chú đơn hàng' }
                  }
                }
              }
            }
          },
          responses: {
            '201': { description: 'Đơn hàng đã được tạo thành công.' }
          }
        }
      },
      '/subscriptions/{id}/renew': {
        post: {
          summary: 'Gia hạn gói dịch vụ',
          description: 'Tạo đơn gia hạn cho khách; tự động nối tiếp ngày hết hạn nếu gói còn hạn.',
          operationId: 'renewSubscription',
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              schema: { type: 'string' },
              description: 'Mã gói dịch vụ cần gia hạn'
            }
          ],
          requestBody: {
            required: false,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    planId: { type: 'string', description: 'Mã gói gia hạn (để trống sẽ dùng lại gói cũ)' },
                    payment: { type: 'string', enum: ['paid', 'unpaid'], default: 'unpaid' }
                  }
                }
              }
            }
          },
          responses: {
            '201': { description: 'Đã gia hạn thành công.' }
          }
        }
      },
      '/orders/{id}/pay': {
        post: {
          summary: 'Xác nhận đã thanh toán đơn',
          description: 'Đánh dấu đơn hàng là đã thu tiền khi nhận được chuyển khoản.',
          operationId: 'markOrderPaid',
          requestBody: { required: false, content: { 'application/json': { schema: { type: 'object', properties: { paidAt: { type: 'string', format: 'date', description: 'Ngày thực tế nhận tiền. Để trống dùng ngày vận hành.' } } } } } },
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              schema: { type: 'string' },
              description: 'Mã đơn hàng'
            }
          ],
          responses: {
            '200': { description: 'Đã xác nhận thanh toán.' }
          }
        }
      },
      '/subscriptions/{id}/contact': {
        post: {
          summary: 'Đánh dấu đã liên hệ nhắc gia hạn',
          description: 'Agent thông báo đã gửi tin nhắn nhắc nhở cho khách.',
          operationId: 'markSubscriptionContacted',
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              schema: { type: 'string' },
              description: 'Mã gói dịch vụ'
            }
          ],
          responses: {
            '200': { description: 'Đã ghi nhận liên hệ.' }
          }
        }
      },
      '/overview': {
        get: {
          summary: 'Xem báo cáo tổng quan kinh doanh',
          description: 'Lấy các chỉ số tổng quan: doanh thu, đơn chưa thu, gói sắp hết hạn, số lượng khách.',
          operationId: 'getOverview',
          responses: {
            '200': { description: 'Báo cáo tổng quan.' }
          }
        }
      }
    }
  };

  return NextResponse.json(spec, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, max-age=3600'
    }
  });
}
