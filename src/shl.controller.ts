import { Controller, Post, Body, Sse, Param, Headers, Req, HttpStatus, HttpException, RawBodyRequest } from '@nestjs/common';
import { ShlService } from './shl.service';
import { Prisma } from '@prisma/client';
import { randomStringWithEntropy } from './utils';
import { CustomRequest } from './middlewares/raw-body.middleware';
import { HealthLink } from './types';
 
@Controller('api')
export class ShlController {
  constructor(private readonly shlService: ShlService) {}
 
  @Post('shl')
  async createLink(@Body() config: Prisma.ShlinkCreateInput) {
    const newLink = await this.shlService.createLink(config);
    return { ...newLink, files: undefined, config: undefined };
  }
 
  @Post('shl/:shlId')
  async handleRawData(
    @Param('shlId') shlId: string,
    @Req() req: Request,
    @Body() body: {passcode: string, recipient: string}, // Define the DTO for the request body
    // @Res() res: Response,
  ) {
    const embeddedLengthMax = 10000;
 
    const shl: HealthLink | null = await this.shlService.getShlInternal(shlId);
 
    if (!shl || !shl?.active) {
      return {
        statusCode: 404,
        message: 'SHL does not exist or has been deactivated.'
      }
    }
 
    // Validate passcode
    if (shl.config.passcode && shl.config.passcode !== body.passcode) {
      await this.shlService.recordPasscodeFailure(shl.id);
      return {
        statusCode: 401,
        message: 'Incorrect password',
        remainingAttempts: shl.passcodeFailuresRemaining - 1,
      }
    }
 
    // Generate access ticket
    const ticket = randomStringWithEntropy(32);
    // Record access
    this.shlService.recordAccess(shl.id, body.recipient);
 
    // Prepare manifest files and endpoints
    const files = (await this.shlService
      .getManifestFiles(shl.id, embeddedLengthMax))
      .map((file) => ({
        contentType: file.contentType,
        embedded: file.content,
        location: `${process.env.PUBLIC_URL}/api/shl/${shl.id}/file/${file.hash}?ticket=${ticket}`,
      }))
      .concat(
        (await this.shlService .getManifestEndpoints(shl.id)).map((endpoint) => ({
          contentType: 'application/smart-api-access',
          embedded: undefined,
          location: `${process.env.PUBLIC_URL}/api/shl/${shl.id}/endpoint/${endpoint.id}?ticket=${ticket}`,
        })),
      );
 
    // Set response headers and send response
    return { files };
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