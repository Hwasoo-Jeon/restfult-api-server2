import { createClient, RedisClientType } from "redis";
import Joi from "joi";
import bcrypt from "bcrypt";
import secure from "../middlewares/secure";
import { user } from "../model/user";
import jwt from "jsonwebtoken";
import express, { Request, Response, NextFunction } from "express";

const redisClient: RedisClientType = createClient({
  socket: {
    port: Number(process.env.REDIS_PORT),
    host: "localhost",
  },
});
//Connect Console
redisClient.on("connect", () => {
  console.info("Redis connected!");
});
//Error Console
redisClient.on("error", (err) => {
  console.error("Redis Client Error", err);
});
// redis v4 연결 (비동기)
redisClient.connect().then();

// cookie 설정
const cookieOptions = {
  httpOnly: true,
  secure: false,
};

const schema = Joi.object().keys({
  // 입력데이터의 검증 스키마 설정
  username: Joi.string().min(8).max(18).required(),
  password: Joi.string().min(12).max(24).required(),
  _csrf: Joi.string().required(),
});

// bcrypt salt 횟수
const saltRound: number = 10;

//csrf 토큰 발급
const router = express.Router();
router.get(
  "/csrf",
  secure.csrfProtection, // CSRF 보호 미들웨어 먼저 적용
  (req: Request, res: Response, next: NextFunction) => {
    //쿠키 이름, 값, 쿠키 설정
    res.cookie("csrfToken", req.csrfToken(), cookieOptions);

    res
      .status(200)
      .json({ status: 200, success: true, message: "Csrf Token Issued" });
  }
);

//회원가입
router.post(
  "/signup",
  secure.csrfProtection,
  async (req: Request, res: Response, next: NextFunction) => {
    let body = req.body;

    try {
      // 입력데이터의 스키마를 통한 검증
      schema.validateAsync(body);

      // mongoose의 model을 통한 mongodb의 컬렉션 조회
      const record = await user.findOne({ username: body.username });
      // (동일 정보로 입력한 사람이 있다면)
      if (record) {
        return res.status(200).json({
          status: 203, // 코드 수정 필요함
          success: false,
          message: "Already existed user",
        });
      }
      // (동일 정보로 입력한 사람이 없다면)
      // hashedpwd로 회원가입 진행
      const hashedPwd = bcrypt.hash(body.password, saltRound);

      const payload = {
        username: body.username,
        password: hashedPwd,
      };
      await user.create(payload);

      return res.status(200).json({
        status: 200,
        success: true,
        message: "Success Sign-in",
      });
    } catch (error) {
      res.status(200).json({
        status: 403,
        success: false,
        message: "Check input",
      });
    }
  }
);

//로그인
router.post(
  "/login",
  secure.csrfProtection,
  async (req: Request, res: Response, next: NextFunction) => {
    const body = req.body;

    try {
      // 입력데이터의 스키마를 통한 검증
      schema.validateAsync(body);

      // (로그인 입력에 문제가 없다면)
      const record = await user.findOne({ username: body.useranme });
      if (record === null) {
        return res.status(200).json({
          status: 403,
          success: false,
          message: "Not registered User",
        });
      }
      // 비밀번호 검증에 따른 결과 비교
      const result = bcrypt.compare(body.password, record.password);
      if (!result) {
        return res.status(200).json({
          status: 403,
          success: false,
          message: "Check pwd",
        });
      }

      const payload = {
        userId: record._id.toString(), // _id 는 mongodb의 각 문서를 구분하는 유일한 식별자, 만일 보안에 탈취되어도  사용자의 개인정보를 알수는 없다.
        username: record.username,
      };

      const secretKey = process.env.SECRET_KEY;
      if (secretKey === undefined) {
        throw new Error("SecretKey is undefined");
      }
      const accessToken = jwt.sign(payload, secretKey);
      const refreshToken = jwt.sign(payload, secretKey);

      res.cookie("accessToken", accessToken, cookieOptions);
      res.cookie("refreshToken", refreshToken, cookieOptions);

      return res.status(200).json({
        status: 200,
        success: true,
        message: "Log-in Success",
      });
    } catch (error) {
      res.status(200).json({
        status: 403,
        success: false,
        message: "Check input",
      });
    }
  }
);
// router 설정

export default router;