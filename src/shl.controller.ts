// src/shl/shl.controller.ts
import { Controller, Post, Body, Sse, Param, Headers, Req, HttpStatus, HttpException, RawBodyRequest } from '@nestjs/common';
import { ShlService } from './shl.service';
import { Prisma } from '@prisma/client';
import { randomStringWithEntropy } from './utils';
import { CustomRequest } from './middlewares/raw-body.middleware';

@Controller('api')
export class ShlController {
  constructor(private readonly shlService: ShlService) {}

  @Post('shl')
  async createLink(@Body() config: Prisma.ShlinkCreateInput) {
    const newLink = await this.shlService.createLink(config);
    return { ...newLink, files: undefined, config: undefined };
  }

  @Post('shl/:shlId')
  async handleRawData(@Param('shlId') shlId: string, @Req() req: Request) {
    // Access the raw body
    const rawBody = req.body;

  }

  @Post('shl/:shlId/file')
  async uploadFile(
    @Param('shlId') shlId: string,
    @Headers('authorization') authorization: string,
    @Req() req: CustomRequest,
  ) {
    const managementToken = authorization?.split(/bearer /i)[1];
    if (!managementToken) {
      throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
    }

    const contentLength = req.headers['content-length'];
    if (!contentLength) {
      throw new HttpException('Missing content length', HttpStatus.BAD_REQUEST);
    }

    const fileSizeMax = 1048576; // Define your file size limit
    if (Number(contentLength) > fileSizeMax) {
      throw new HttpException('Size limit exceeded', HttpStatus.PAYLOAD_TOO_LARGE);
    }

    if (!this.shlService.linkExists(shlId)) {
      throw new HttpException('SHL does not exist or has been deactivated.', HttpStatus.NOT_FOUND);
    }

    const shl = await this.shlService.getManagedShl(shlId, managementToken);
    if (!shl) {
      throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
    }

    const newFile = {
      contentType: req.headers['content-type'] as string,
      content: req.rawBody,
    };

    const added = this.shlService.addFile(shl.id, newFile);

    return {...shl, added };
  }

  // @Sse('subscribe')
  // async subscribe(@Body() shlSet: { shlId: string; managementToken: string }[]) {
  //   // // Map the SHL set to managed links
  //   // const managedLinks = shlSet.map((req) =>
  //   //   db.DbLinks.getManagedShl(req.shlId, req.managementToken),
  //   // );

  //   // Generate a random ticket
  //   const ticket = randomStringWithEntropy(32, 'subscription-ticket-');

  //   // // Store ticket in the map
  //   // subscriptionTickets.set(
  //   //   ticket,
  //   //   managedLinks.map((l) => l.id),
  //   // );

  //   // // Set a timeout to delete the ticket
  //   // setTimeout(() => {
  //   //   subscriptionTickets.delete(ticket);
  //   // }, 10000);

  //   // // Return the subscription URL
  //   return { subscribe: `${process.env.PUBLIC_URL}/api/subscribe/${ticket}` };
  // }
}
